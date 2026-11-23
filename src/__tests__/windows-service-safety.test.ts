import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { installNewService, InstallOptions } from '../core/agent/safe-install';
import { assertExpectedSha256 } from '../core/self-update/verify';
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
    nodeAgent:{
        entryFile:'C:\\Program Files\\TenantAgent\\app\\dist\\index.js',
        workingDir:'C:\\ProgramData\\TenantAgent\\runtime',
        runtimeVersion:'v22.15.0'
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
