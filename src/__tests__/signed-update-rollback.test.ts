import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import {
    SignedAgentManifest, manifestSigningMessage, verifySignedAgentBinary
} from '../core/agent/signed-update';
import {
    runStagedSignedUpdate, StagedServiceUpdateOps
} from '../core/agent/staged-service-update';

const pair=generateKeyPairSync('ed25519');
const publicPem=pair.publicKey.export({type:'spki',format:'pem'}).toString();
const anotherPair=generateKeyPairSync('ed25519');
const wrongPublicPem=anotherPair.publicKey.export({type:'spki',format:'pem'}).toString();
const nextBinary=Buffer.from('synthetic-tenant-agent-next-binary-v2');
function manifestFor(binary:Buffer=nextBinary,version='2.0.0'):SignedAgentManifest {
    const digest=createHash('sha256').update(binary).digest('hex');
    const signature=sign(null,manifestSigningMessage(version,digest),pair.privateKey).toString('base64');
    return {schemaVersion:1,version,sha256:digest,signature};
}
const signed=manifestFor();
type Failure = 'backup'|'backup-corrupt'|'stop'|'replace'|'start'|'health'|'restore'|'rollback-start';
function simulate(fail?:Failure) {
    const old=Buffer.from('synthetic-installed-version-v1');
    let installed=Buffer.from(old);
    let backup:Buffer|undefined;
    let running=true;
    let startCount=0;
    const events:string[]=[];
    const ops:StagedServiceUpdateOps = {
        approved:true,
        async isServiceRunning(){events.push('status');return running;},
        async readInstalled(){events.push('read-installed');return Buffer.from(installed);},
        async writeBackup(bytes){
            events.push('backup');
            if(fail==='backup')throw Error('disk full');
            backup=Buffer.from(fail==='backup-corrupt'?Buffer.from('tampered'):bytes);
        },
        async readBackup(){events.push('read-backup');return backup?Buffer.from(backup):Buffer.alloc(0);},
        async stopService(){
            events.push('stop');
            if(fail==='stop')throw Error('SCM stop denied');
            running=false;
        },
        async replaceInstalled(bytes){
            events.push('replace');
            installed=Buffer.from(bytes);
            if(fail==='replace')throw Error('interrupted replacement');
        },
        async startService(){
            events.push('start');
            startCount++;
            if((fail==='start'&&startCount===1)||
               (fail==='rollback-start'&&startCount===2))throw Error('SCM start failed');
            running=true;
        },
        async healthCheck(){
            events.push('health');
            return fail!=='health' || startCount>1;
        },
        async restoreInstalled(bytes){
            events.push('restore');
            if(fail==='restore')throw Error('restore permission denied');
            installed=Buffer.from(bytes);
        }
    };
    return {ops,old,events,getInstalled:()=>installed,getRunning:()=>running};
}
test('Ed25519 signed binary and correct domain/version/hash are required',()=>{
    assert.doesNotThrow(()=>verifySignedAgentBinary(nextBinary,signed,publicPem));
    assert.throws(()=>verifySignedAgentBinary(Buffer.from('modified'),signed,publicPem),/SHA-256 mismatch/);
    assert.throws(()=>verifySignedAgentBinary(nextBinary,signed,wrongPublicPem),/signature invalid/);
    assert.throws(()=>verifySignedAgentBinary(nextBinary,{...signed,version:'2.0.1'},publicPem),/signature invalid/);
    assert.throws(()=>verifySignedAgentBinary(nextBinary,{...signed,signature:''},publicPem),/Invalid signed/);
    assert.throws(()=>verifySignedAgentBinary(nextBinary,{...signed,sha256:'0'.repeat(64)},publicPem),/SHA-256 mismatch/);
    assert.throws(()=>verifySignedAgentBinary(nextBinary,{...signed,schemaVersion:2 as 1},publicPem),/Invalid signed/);
    assert.throws(()=>verifySignedAgentBinary(nextBinary,signed,'not-a-trusted-key'),/Trusted Ed25519/);
});
test('no explicit approval or invalid signature means no service operations',async()=>{
    const x=simulate();
    x.ops.approved=false;
    await assert.rejects(()=>runStagedSignedUpdate(nextBinary,signed,publicPem,x.ops),/approval/);
    assert.deepEqual(x.events,[]);
    x.ops.approved=true;
    await assert.rejects(()=>runStagedSignedUpdate(nextBinary,signed,wrongPublicPem,x.ops),/signature/);
    assert.deepEqual(x.events,[]);
});
test('normal transaction: verifies durable backup BEFORE stop, replaces then health-checks',async()=>{
    const x=simulate();
    await runStagedSignedUpdate(nextBinary,signed,publicPem,x.ops);
    assert.equal(x.getInstalled().toString(),nextBinary.toString());
    assert.equal(x.getRunning(),true);
    const stopAt=x.events.indexOf('stop');
    assert.ok(x.events.indexOf('backup')<stopAt);
    assert.ok(x.events.indexOf('read-backup')<stopAt);
    assert.deepEqual(x.events.filter(e=>e==='replace'||e==='restore'),['replace']);
});
test('disk or backup corruption stops before touching Windows service',async()=>{
    for(const failure of ['backup','backup-corrupt'] as const){
        const x=simulate(failure);
        await assert.rejects(()=>runStagedSignedUpdate(nextBinary,signed,publicPem,x.ops),/disk full|Backup verification/);
        assert.ok(!x.events.includes('stop'));
        assert.ok(!x.events.includes('replace'));
        assert.deepEqual(x.getInstalled(),x.old);
        assert.equal(x.getRunning(),true);
    }
});
test('unknown stopped service cannot be upgraded or overwritten',async()=>{
    const x=simulate();
    x.ops.isServiceRunning=async()=>false;
    await assert.rejects(()=>runStagedSignedUpdate(nextBinary,signed,publicPem,x.ops),/Service must be running/);
    assert.ok(!x.events.includes('backup'));
});
test('failed stop refuses any binary replacement',async()=>{
    const x=simulate('stop');
    await assert.rejects(()=>runStagedSignedUpdate(nextBinary,signed,publicPem,x.ops),/inspect Windows Service/);
    assert.ok(!x.events.includes('replace'));
    assert.deepEqual(x.getInstalled(),x.old);
});
test('interrupted binary write, failed startup and unhealthy new version trigger verified rollback',async()=>{
    for(const failure of ['replace','start','health'] as const) {
        const x=simulate(failure);
        await assert.rejects(()=>runStagedSignedUpdate(nextBinary,signed,publicPem,x.ops),
            /previous signed-off artifact restored and healthy/);
        assert.deepEqual(x.getInstalled(),x.old, 'Previous binary restored after '+failure);
        assert.equal(x.getRunning(),true);
        assert.ok(x.events.includes('restore'));
    }
});
test('rollback failure is surfaced as MANUAL RECOVERY; never claim success',async()=>{
    for(const failure of ['restore','rollback-start'] as const){
        const x=simulate(failure);
        // Force the rollback path by making the new version fail health check.
        let checks=0;
        x.ops.healthCheck=async()=>{
            checks++;
            return checks>1;
        };
        await assert.rejects(()=>runStagedSignedUpdate(nextBinary,signed,publicPem,x.ops),
            /manual recovery required/);
        assert.ok(x.events.includes('restore'));
    }
});
