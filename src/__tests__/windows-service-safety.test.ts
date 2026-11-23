import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { installNewService, InstallOptions } from '../core/agent/safe-install';
import { assertAclSnapshot, assertNodeBackupLocation, AclSnapshot } from '../core/agent/windows-security-preflight';
import { assertExpectedSha256 } from '../core/self-update/verify';
import { assertInstalledNodeService, transitionVerifiedService } from '../core/agent/secure-service-lifecycle';
import { applyUpdate } from '../update/apply';

const fileNames={
    agentExe:'C:\\Program Files\\TenantAgent\\bin\\tenant-agent.exe',
    ctlExe:'C:\\Program Files\\TenantAgent\\bin\\agentctl.exe',
    nssmExe:'C:\\Program Files\\TenantAgent\\bin\\nssm.exe',
    configFile:'C:\\ProgramData\\TenantAgent\\config\\agent.env'
};
function scenario(status:{code:number;stderr:string;stdout?:string}, opts:{missing?:string;failCommand?:string;failCleanup?:boolean}={}){
    const history:string[][]=[];
    const options:InstallOptions={
        serviceName:'tenant-agent', binDir:'C:\\Program Files\\TenantAgent\\bin',
        ...fileNames,
        fileExists:f=>f!==opts.missing,
        run:async args=>{
            history.push(args);
            if(args[0]==='status')return {code:status.code,stdout:status.stdout??'',stderr:status.stderr};
            if(args[0]==='remove'&&opts.failCleanup)return {code:5,stderr:'Failed',stdout:''};
            if(opts.failCommand===args[0]+' '+args[2])return {code:5,stderr:'Failed',stdout:''};
            return {code:0,stdout:'',stderr:''};
        }
    };
    return {options,history};
}
test('existing service is never stopped, removed or overwritten by install',async()=>{
    const x=scenario({code:0,stdout:'SERVICE_RUNNING',stderr:''});
    await assert.rejects(()=>installNewService(x.options),/already exists/);
    assert.deepEqual(x.history,[['status','tenant-agent']]);
});
test('missing agent binary or config fails before any SCM query',async()=>{
    for(const missing of [fileNames.agentExe,fileNames.configFile]){
        const x=scenario({code:3,stderr:'service does not exist'},{missing});
        await assert.rejects(()=>installNewService(x.options),/prerequisite/);
        assert.equal(x.history.length,0);
    }
});
test('unknown NSSM failure fails closed with no service modification',async()=>{
    const x=scenario({code:5,stderr:'Access denied'});
    await assert.rejects(()=>installNewService(x.options),/could not be confirmed/);
    assert.equal(x.history.length,1);
});
test('new service is configured only for manual start',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"});
    await installNewService(x.options);
    assert.deepEqual(x.history,[
        ['status','tenant-agent'],
        ['install','tenant-agent',fileNames.agentExe],
        ['set','tenant-agent','AppDirectory',x.options.binDir],
        ['set','tenant-agent','Start','SERVICE_DEMAND_START']
    ]);
    assert.equal(x.history.filter(x=>x[0]==='remove'||x[0]==='stop').length,0);
});
test('new registration is rolled back if post-install configuration fails',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"},{failCommand:'set AppDirectory'});
    await assert.rejects(()=>installNewService(x.options),/AppDirectory/);
    assert.deepEqual(x.history.at(-1),['remove','tenant-agent','confirm']);
});
test('partial rollback failure is reported and not hidden',async()=>{
    const x=scenario({code:3,stderr:'not installed'},{
        failCommand:'set AppDirectory',failCleanup:true
    });
    await assert.rejects(()=>installNewService(x.options),/manual recovery required/);
});
test('checksum verification rejects absent, invalid or altered update contents',()=>{
    const data=Buffer.from('agentctl-ci-only-test-binary');
    const digest=createHash('sha256').update(data).digest('hex');
    assert.doesNotThrow(()=>assertExpectedSha256(data,digest));
    assert.throws(()=>assertExpectedSha256(data,undefined),/Missing or invalid/);
    assert.throws(()=>assertExpectedSha256(data,'bad'),/Missing or invalid/);
    assert.throws(()=>assertExpectedSha256(Buffer.from('modified'),digest),/checksum mismatch/);
});
test('in-place unsafe update is blocked before any service mutation',async()=>{
    await assert.rejects(()=>applyUpdate('C:\\fake-update.exe'),/blocked/);
});


const nodeServiceFixture={
    agentExe:'C:\\Program Files\\nodejs\\node.exe',
    ctlExe:'C:\\Program Files\\nodejs\\node.exe',
    configFile:'C:\\ProgramData\\TenantAgent\\config\\agent.env',
    verifyNodeSecurity:()=>undefined,
    configureServiceSid:async()=>undefined,
    nodeAgent:{
        entryFile:'C:\\Program Files\\TenantAgent\\app\\dist\\index.js',
        workingDir:'C:\\ProgramData\\TenantAgent\\runtime',
        runtimeVersion:'v22.15.0',
        serviceAccount:'NT AUTHORITY\\LocalService' as const,
        serviceSid:'S-1-5-80-123-456-789-101-112'
    }
};

test('opt-in Node 22 mode registers exact executable, config path and entry without secrets',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"});
    const options:InstallOptions={...x.options,...nodeServiceFixture};
    await installNewService(options);
    assert.deepEqual(x.history,[
        ['status','tenant-agent'],
        ['install','tenant-agent',nodeServiceFixture.agentExe],
        ['set','tenant-agent','AppDirectory',nodeServiceFixture.nodeAgent.workingDir],
        ['set','tenant-agent','AppParameters',
            '"--env-file='+nodeServiceFixture.configFile+'" "'+
                nodeServiceFixture.nodeAgent.entryFile+'"'],
        ['set','tenant-agent','ObjectName','NT AUTHORITY\\LocalService',''],
        ['set','tenant-agent','Start','SERVICE_DEMAND_START']
    ]);
    assert.doesNotMatch(JSON.stringify(x.history),/password=|token=|key=/i);
    assert.equal(x.history.some(step=>step[0]==='start'||step[0]==='stop'),false);
});

test('opt-in Node mode refuses unsafe runtime, paths and missing artifacts before SCM',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"});
    const badCases:InstallOptions[]=[
        {...x.options,...nodeServiceFixture,
            nodeAgent:{...nodeServiceFixture.nodeAgent,runtimeVersion:'v18.20.0'}},
        {...x.options,...nodeServiceFixture,
            nodeAgent:{...nodeServiceFixture.nodeAgent,entryFile:'C:\\temporary\\evil.js'}},
        {...x.options,...nodeServiceFixture,
            nodeAgent:{...nodeServiceFixture.nodeAgent,entryFile:'C:\\Program Files\\TenantAgent\\app\\dist\\index.js" --eval="evil'}},
        {...x.options,...nodeServiceFixture,
            nodeAgent:{...nodeServiceFixture.nodeAgent,workingDir:'C:\\Users\\Public\\data'}},
        {...x.options,...nodeServiceFixture,
            nodeAgent:{...nodeServiceFixture.nodeAgent,entryFile:'C:\\Program Files\\TenantAgent\\app\\dist\\..\\index.js'}}
    ];
    for(const options of badCases){
        await assert.rejects(()=>installNewService(options),/Node service|Invalid Node/);
    }
    assert.deepEqual(x.history,[]);
    const y=scenario({code:3,stderr:"Can't open service"},{missing:nodeServiceFixture.nodeAgent.entryFile});
    await assert.rejects(()=>installNewService({...y.options,...nodeServiceFixture}),/prerequisite/);
    assert.deepEqual(y.history,[]);
});

test('opt-in Node NSSM parameter setup failure removes only newly registered service',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"},{failCommand:'set AppParameters'});
    await assert.rejects(()=>installNewService({...x.options,...nodeServiceFixture}),/AppParameters/);
    assert.deepEqual(x.history.at(-1),['remove','tenant-agent','confirm']);
});

test('opt-in Node install refuses an existing service without changing its parameters',async()=>{
    const x=scenario({code:0,stdout:'SERVICE_RUNNING',stderr:''});
    await assert.rejects(()=>installNewService({...x.options,...nodeServiceFixture}),/already exists/);
    assert.deepEqual(x.history,[['status','tenant-agent']]);
});


test('node install always refuses a missing or rejected ACL preflight before NSSM status',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"});
    await assert.rejects(
        ()=>installNewService({...x.options,...nodeServiceFixture,verifyNodeSecurity:undefined}),
        /ACL security verification is required/
    );
    assert.deepEqual(x.history,[]);
    let checked=0;
    await assert.rejects(
        ()=>installNewService({...x.options,...nodeServiceFixture,
            verifyNodeSecurity:async()=>{
                checked++;
                throw Error('Windows ACL preflight denied');
            }}),
        /Windows ACL preflight denied/
    );
    assert.equal(checked,1);
    assert.deepEqual(x.history,[]);
});

const unitServiceSid='S-1-5-80-123-456-789-101-112';
const ownerRightsRead={sid:'S-1-3-4',type:'Allow',rights:131072} as const;
const trustedAcl:AclSnapshot={
    reparse:false,
    entries:[
        {sid:'S-1-5-18',type:'Allow',rights:2032127},
        {sid:'S-1-5-32-544',type:'Allow',rights:2032127}
    ]
};
test('ACL preflight permits only privileged private config / runtime grants',()=>{
    assert.doesNotThrow(()=>assertAclSnapshot(trustedAcl,'private'));
    const broad={...trustedAcl,entries:[
        ...trustedAcl.entries,{sid:'S-1-5-32-545',type:'Allow',rights:131209}
    ]};
    assert.throws(()=>assertAclSnapshot(broad,'private'),/untrusted private/);
    assert.doesNotThrow(()=>assertAclSnapshot(broad,'code'),
        'Read-only access to installed application must remain possible');
    const groupWrite={...trustedAcl,entries:[
        ...trustedAcl.entries,{sid:'S-1-5-11',type:'Allow',rights:197055}
    ]};
    assert.throws(()=>assertAclSnapshot(groupWrite,'code'),/application write/);
    assert.throws(()=>assertAclSnapshot(groupWrite,'private'),/untrusted private/);
});
test('ACL preflight fails closed on reparse points, malformed ACLs and absent SYSTEM access',()=>{
    assert.throws(()=>assertAclSnapshot({...trustedAcl,reparse:true},'private'),/redirected/);
    assert.throws(()=>assertAclSnapshot({reparse:false,entries:[]},'code'),/invalid/);
    assert.throws(()=>assertAclSnapshot({reparse:false,entries:[{
        sid:'unknown identity',type:'Allow',rights:2032127
    }]},'private'),/cannot interpret/);
    assert.throws(()=>assertAclSnapshot({reparse:false,entries:[{
        sid:'S-1-5-32-544',type:'Allow',rights:2032127
    }]},'private'),/SYSTEM write/);
});


test('Node mode refuses missing or privileged Windows service accounts before NSSM',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"});
    const wrong=([
        undefined,
        'LocalSystem',
        'NT AUTHORITY\\SYSTEM',
        'NT AUTHORITY\\NetworkService'
    ] as unknown[]);
    for(const account of wrong){
        const agent={...nodeServiceFixture.nodeAgent,serviceAccount:account as 'NT AUTHORITY\\LocalService'};
        await assert.rejects(
            ()=>installNewService({...x.options,...nodeServiceFixture,nodeAgent:agent}),
            /low-privilege LocalService identity/
        );
    }
    assert.deepEqual(x.history,[]);
});

test('Node service identity setup failure rolls back the new service',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"},{failCommand:'set ObjectName'});
    await assert.rejects(
        ()=>installNewService({...x.options,...nodeServiceFixture}),
        /ObjectName/
    );
    assert.deepEqual(x.history.at(-1),['remove','tenant-agent','confirm']);
});

test('LocalService config read without write and runtime limited Modify must be explicit',()=>{
    const sid=unitServiceSid;
    const readonly={
        ...trustedAcl,
        entries:[...trustedAcl.entries,ownerRightsRead,{sid,type:'Allow',rights:131209}]
    };
    const runtime={
        ...trustedAcl,
        entries:[...trustedAcl.entries,ownerRightsRead,{sid,type:'Allow',rights:1245631}]
    };
    assert.doesNotThrow(()=>assertAclSnapshot(readonly,'service-config',unitServiceSid));
    assert.doesNotThrow(()=>assertAclSnapshot(runtime,'service-runtime',unitServiceSid));
    assert.throws(()=>assertAclSnapshot(trustedAcl,'service-config',unitServiceSid),/explicit per-service SID/);
    assert.throws(()=>assertAclSnapshot(readonly,'service-runtime',unitServiceSid),/explicit per-service SID/);
    assert.throws(()=>assertAclSnapshot(runtime,'service-config',unitServiceSid),/must not write/);
    const full={
        ...trustedAcl,
        entries:[...trustedAcl.entries,{sid,type:'Allow',rights:2032127}]
    };
    assert.throws(()=>assertAclSnapshot(full,'service-runtime',unitServiceSid),/permission escalation/);
    const denied={
        ...runtime,entries:[...runtime.entries,{sid,type:'Deny',rights:1}]
    };
    assert.throws(()=>assertAclSnapshot(denied,'service-runtime',unitServiceSid),/explicitly denied/);
    const foreign={
        ...runtime,entries:[...runtime.entries,
            {sid:'S-1-5-32-545',type:'Allow',rights:131209}]
    };
    assert.throws(()=>assertAclSnapshot(foreign,'service-runtime',unitServiceSid),/untrusted private/);
});


test('Node installation refuses missing or malformed service SID before NSSM',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"});
    const incorrect=[undefined,'S-1-5-19','S-1-5-80-123'];
    for(const serviceSid of incorrect){
        await assert.rejects(
            ()=>installNewService({...x.options,...nodeServiceFixture,
                nodeAgent:{...nodeServiceFixture.nodeAgent,serviceSid:serviceSid as string}}),
            /per-service SID/
        );
    }
    await assert.rejects(
        ()=>installNewService({...x.options,...nodeServiceFixture,configureServiceSid:undefined}),
        /SID configuration is required/
    );
    assert.deepEqual(x.history,[]);
});

test('per-service SID registration failure rolls back without starting Node service',async()=>{
    const x=scenario({code:3,stderr:"Can't open service"});
    let attempts=0;
    await assert.rejects(
        ()=>installNewService({...x.options,...nodeServiceFixture,configureServiceSid:async()=>{
            attempts++;
            throw Error('Simulated sc.exe sidtype failed');
        }}),
        /sidtype failed/
    );
    assert.equal(attempts,1);
    assert.deepEqual(x.history.at(-1),['remove','tenant-agent','confirm']);
    assert.equal(x.history.some(x=>x[0]==='set'&&x[2]==='Start'),false);
});

test('service SID is required on config/SQLite and shared LocalService grants are refused',()=>{
    const localService='S-1-5-19';
    const secure={
        ...trustedAcl,
        entries:[...trustedAcl.entries,ownerRightsRead,
            {sid:unitServiceSid,type:'Allow',rights:131209}]
    };
    assert.doesNotThrow(()=>assertAclSnapshot(secure,'service-config',unitServiceSid));
    const broadShared={
        ...secure,entries:[...secure.entries,
            {sid:localService,type:'Allow',rights:131209}]
    };
    assert.throws(()=>assertAclSnapshot(broadShared,'service-config',unitServiceSid),
        /untrusted private/);
    assert.throws(()=>assertAclSnapshot(secure,'service-config'),
        /Validated per-service SID/);
});


test('generated service-owned SQLite files must protect owner implicit WRITE_DAC',()=>{
    const serviceGrant={sid:unitServiceSid,type:'Allow',rights:1245631} as const;
    const unprotected:AclSnapshot={...trustedAcl,
        entries:[...trustedAcl.entries,serviceGrant]};
    assert.throws(
        ()=>assertAclSnapshot(unprotected,'service-runtime',unitServiceSid),
        /OWNER RIGHTS/
    );
    const guarded:AclSnapshot={...trustedAcl,
        entries:[...trustedAcl.entries,ownerRightsRead,serviceGrant]};
    assert.doesNotThrow(
        ()=>assertAclSnapshot(guarded,'service-runtime',unitServiceSid)
    );
    const escalation:AclSnapshot={...trustedAcl,
        entries:[...trustedAcl.entries,
            {sid:'S-1-3-4',type:'Allow',rights:0x00060000},
            serviceGrant]};
    assert.throws(
        ()=>assertAclSnapshot(escalation,'service-runtime',unitServiceSid),
        /OWNER RIGHTS must not grant/
    );
    const ownerDataRead:AclSnapshot={...trustedAcl,
        entries:[...trustedAcl.entries,
            {sid:'S-1-3-4',type:'Allow',rights:0x00020001},
            serviceGrant]};
    assert.throws(
        ()=>assertAclSnapshot(ownerDataRead,'service-runtime',unitServiceSid),
        /OWNER RIGHTS must not grant/
    );
});


test('Node tenant-agent production backup is absolute and outside app and runtime trees', () => {
    const entry = 'C:\\Program Files\\TenantAgent\\app\\dist\\index.js';
    const runtime = 'C:\\ProgramData\\TenantAgent\\runtime';
    const backup = 'C:\\ProgramData\\TenantAgent\\verified-backups';
    assert.equal(assertNodeBackupLocation('production', backup, entry, runtime), backup);
    for (const rejected of [
        undefined,
        '',
        '.\\backups',
        'backups',
        'C:\\ProgramData\\TenantAgent\\runtime\\backups',
        'C:\\Program Files\\TenantAgent\\backup',
        'C:\\Program Files\\TenantAgent\\app\\dist\\backup',
        'C:\\ProgramData\\TenantAgent\\runtime\\..\\verified-backups',
        '\\\\untrusted-host\\share\\backup',
        'C:\\ProgramData\\TenantAgent\\backup" --eval',
        'C:\\ProgramData\\TenantAgent\\backup\nINJECTED=1'
    ]) {
        assert.throws(
            () => assertNodeBackupLocation('production', rejected, entry, runtime),
            /backup/i,
            'Unsafe backup destination must be blocked'
        );
    }
    assert.throws(() => assertNodeBackupLocation('development', backup, entry, runtime),
        /backup/i,
        'Node Windows service must explicitly opt into production config');
});


test('reviewed Node service registration rejects executable, identity and config drift', () => {
    const expected = {
        Application: 'C:\\Program Files\\nodejs\\node.exe',
        AppParameters: '"--env-file=C:\\ProgramData\\TenantAgent\\config\\agent.env" ' +
            '"C:\\Program Files\\TenantAgent\\app\\dist\\index.js"',
        AppDirectory: 'C:\\ProgramData\\TenantAgent\\runtime',
        ObjectName: 'NT AUTHORITY\\LocalService'
    };
    assert.doesNotThrow(() => assertInstalledNodeService(expected));
    for (const [key, replacement] of [
        ['Application', 'C:\\Users\\Public\\node.exe'],
        ['AppParameters', '"--env-file=C:\\Users\\Public\\secrets.env" "C:\\evil.js"'],
        ['AppDirectory', 'C:\\Users\\Public'],
        ['ObjectName', 'LocalSystem']
    ] as Array<[keyof typeof expected, string]>) {
        assert.throws(() => assertInstalledNodeService({...expected,[key]:replacement}),
            /does not match reviewed configuration/, key);
    }
});

test('verified service start/restart refuses preflight drift before SCM calls', async () => {
    const calls:string[][]=[];
    const run=async(args:string[])=>{
        calls.push(args);
        return {code:0,stdout:'SERVICE_STOPPED',stderr:''};
    };
    await assert.rejects(()=>transitionVerifiedService('start',()=>{
        throw Error('Synthetic backup directory ACL drift');
    },run),/ACL drift/);
    await assert.rejects(()=>transitionVerifiedService('restart',()=>{
        throw Error('Synthetic identity drift');
    },run),/identity drift/);
    assert.deepEqual(calls,[],'Unsafe service must not be queried, stopped or started');
});

test('verified service start handles exact status and never starts an already running service', async()=>{
    const calls:string[][]=[];
    let audited=0;
    const run=async(args:string[])=>{
        calls.push(args);
        return {code:0,stdout: args[0]==='status'?'SERVICE_STOPPED':'',stderr:''};
    };
    assert.equal(await transitionVerifiedService('start',()=>{
        audited++;
    },run),'started');
    assert.equal(audited,1);
    assert.deepEqual(calls,[['status','tenant-agent'],['start','tenant-agent']]);

    calls.length=0;
    const running=async(args:string[])=>{
        calls.push(args);
        return {code:0,stdout:'SERVICE_RUNNING',stderr:''};
    };
    assert.equal(await transitionVerifiedService('start',()=>{},running),'already-running');
    assert.deepEqual(calls,[['status','tenant-agent']]);
});

test('verified service restart requires clean stop before any new start', async()=>{
    const calls:string[][]=[];
    let state='SERVICE_RUNNING';
    const run=async(args:string[])=>{
        calls.push(args);
        if(args[0]==='stop')state='SERVICE_STOPPED';
        return {code:0,stdout:args[0]==='status'?state:'',stderr:''};
    };
    assert.equal(await transitionVerifiedService('restart',()=>{},run),'restarted');
    assert.deepEqual(calls,[
        ['status','tenant-agent'],['stop','tenant-agent'],
        ['status','tenant-agent'],['start','tenant-agent']
    ]);

    calls.length=0;
    const failStop=async(args:string[])=>{
        calls.push(args);
        return {code:args[0]==='stop'?5:0,
            stdout:args[0]==='status'?'SERVICE_RUNNING':'',stderr:'private failure'};
    };
    await assert.rejects(()=>transitionVerifiedService('restart',()=>{},failStop),/stop failed/);
    assert.deepEqual(calls,[['status','tenant-agent'],['stop','tenant-agent']]);
});

test('verified service start rejects unknown SCM state and refuses raw stderr leakage', async()=>{
    for(const state of ['SERVICE_PAUSED','SERVICE_START_PENDING','SERVICE_UNKNOWN']){
        const calls:string[][]=[];
        const run=async(args:string[])=>{
            calls.push(args);
            return {code:0,stdout:state,stderr:'SECRET_SHOULD_NOT_BE_EMITTED'};
        };
        await assert.rejects(()=>transitionVerifiedService('start',()=>{},run),
            /Unrecognized Windows service state/);
        assert.deepEqual(calls,[['status','tenant-agent']]);
    }
    const failed=async()=>({
        code:5,stdout:'',stderr:'private-creds-should-not-leak'
    });
    await assert.rejects(()=>transitionVerifiedService('start',()=>{},failed),
        error => error instanceof Error &&
        !error.message.includes('private-creds-should-not-leak'));
});
