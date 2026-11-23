#!/usr/bin/env node
'use strict';
// A real Node tenant-agent under genuine NSSM / Windows SCM on an ephemeral
// GitHub-hosted Windows runner. Never execute this on a local or production PC.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const child=require('node:child_process');
const {installNewService}=require('../../dist/core/agent/safe-install.js');

assert(process.platform==='win32' && process.env.CI==='true' &&
  process.env.GITHUB_ACTIONS==='true' && process.env.RUNNER_OS==='Windows' &&
  process.env.RUNNER_ENVIRONMENT==='github-hosted',
  'Refusing real SCM test outside disposable GitHub-hosted Windows CI');
assert(process.env.GITHUB_HEAD_REF==='hardening/release-security-baseline-20261122',
  'Only the audited Draft PR branch may run this test');
assert(/^\d{5,16}$/.test(process.env.GITHUB_RUN_ID||''),'Invalid CI run identifier');
assert(/^v22\./.test(process.version),'Node 22 required');
const id=process.env.GITHUB_RUN_ID;
const serviceName='GTSPNodeAgentQA_'+id;
const programFiles=process.env.ProgramFiles||'C:\\Program Files';
const programData=process.env.ProgramData||'C:\\ProgramData';
const appRoot=path.join(programFiles,'TenantAgent','app');
const distPath=path.join(appRoot,'dist');
const entry=path.join(distPath,'index.js');
const dataRoot=path.join(programData,'TenantAgent');
const workDir=path.join(dataRoot,'runtime');
const configDir=path.join(dataRoot,'config');
const configFile=path.join(configDir,'agentci_'+id+'.env');
const source=path.resolve('integration','tenant-agent');
const nssm=process.env.NSSM_EXE;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let serviceReserved=false,stagedApp=false,stagedData=false;

function cmd(exe,args,allowFailure=false){
  const r=child.spawnSync(exe,args,{encoding:'utf8',windowsHide:true,timeout:20000,
    stdio:['ignore','pipe','pipe']});
  if((r.error||r.status!==0)&&!allowFailure){
    throw Error('Windows QA command failed: '+path.basename(exe)+' ('+
      (r.status===null?'unknown':r.status)+')');
  }
  return r;
}
function state(){
  const r=cmd('sc.exe',['query',serviceName],true);
  if(r.status!==0)return null;
  const m=/STATE\s*:\s*\d+\s+([A-Z_]+)/.exec(r.stdout);
  if(!m)throw Error('Unrecognized Windows SCM state');
  return m[1];
}
async function until(predicate,label,timeout=25000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    if(await predicate())return;
    await delay(300);
  }
  throw Error('Timed out waiting for '+label);
}
async function main(){
  assert(nssm&&fs.existsSync(nssm),'Pinned NSSM missing from hosted runner');
  assert(fs.existsSync(path.join(source,'dist','index.js')),'Compiled agent entry missing');
  assert(fs.existsSync(path.join(source,'node_modules','better-sqlite3')),
    'Native SQLite dependency missing');
  assert.equal(state(),null,'Would overwrite existing SCM registration');
  assert(!fs.existsSync(path.join(programFiles,'TenantAgent')),
    'CI app installation directory already exists');
  assert(!fs.existsSync(dataRoot),'CI data directory already exists');

  // Create a disposable, complete Node app with compiled JS, its package type
  // and native modules. No production credentials or service binaries are used.
  fs.mkdirSync(appRoot,{recursive:true});stagedApp=true;
  fs.cpSync(path.join(source,'dist'),distPath,{recursive:true});
  fs.copyFileSync(path.join(source,'package.json'),path.join(appRoot,'package.json'));
  fs.cpSync(path.join(source,'node_modules'),path.join(appRoot,'node_modules'),{
    recursive:true,dereference:true
  });
  fs.mkdirSync(workDir,{recursive:true});stagedData=true;
  fs.mkdirSync(configDir,{recursive:true});
  fs.writeFileSync(configFile,[
    'TENANT_ID=tenant_ci_qa',
    'TENANT_API_URL=http://127.0.0.1:59991',
    'SYSTEM_API_URL=http://127.0.0.1:59992',
    'TENANT_AGENT_API_KEY=ci-only-agent-local-token-longer-than-32-bytes',
    'CENTRAL_AGENT_API_KEY=ci-only-central-local-token-longer-than-32-bytes',
    'TENANT_SYNC_INTERVAL_MS=1000',
    'TENANT_HEARTBEAT_INTERVAL_MS=1000'
  ].join('\n')+'\n',{flag:'wx',mode:0o600});

  serviceReserved=true;
  await installNewService({
    serviceName,agentExe:process.execPath,ctlExe:process.execPath,
    nssmExe:nssm,binDir:appRoot,configFile,
    nodeAgent:{entryFile:entry,workingDir:workDir,runtimeVersion:process.version},
    fileExists:fs.existsSync,
    run:async args=>{
      const r=cmd(nssm,args,true);
      return {code:r.error?1:(r.status===null?1:r.status),
        stdout:r.stdout||'',stderr:r.stderr||''};
    }
  });
  assert.equal(state(),'STOPPED','Installer must use demand-start, not auto-start');
  const params=cmd(nssm,['get',serviceName,'AppParameters']).stdout;
  assert(params.includes('--env-file=')&&params.includes('index.js'),
    'NSSM did not retain reviewed Node arguments');
  assert(!params.includes('ci-only-'),'NSSM parameters contain synthetic secret');

  cmd('sc.exe',['start',serviceName]);
  await until(()=>state()==='RUNNING','actual Node.js service RUNNING');
  const dbPath=path.join(workDir,'data','outbox.db');
  await until(()=>fs.existsSync(dbPath)&&fs.statSync(dbPath).size>0,
    'genuine tenant-agent SQLite initialization',20000);
  cmd('sc.exe',['stop',serviceName]);
  await until(()=>state()==='STOPPED','actual Node.js service STOPPED');
  assert(fs.existsSync(dbPath),'Stopped service unexpectedly deleted SQLite outbox');
  cmd('sc.exe',['start',serviceName]);
  await until(()=>state()==='RUNNING','actual Node.js service restart');
  await until(()=>fs.existsSync(dbPath),'durable outbox persists after service restart');
  console.log('PASS genuine Node 22 tenant-agent: NSSM register, SCM start/stop/restart, persistent SQLite');
}
async function cleanup(){
  let error;
  if(serviceReserved){
    try{
      if(state()&&state()!=='STOPPED'){
        cmd('sc.exe',['stop',serviceName]);
        await until(()=>state()==='STOPPED','CI SCM cleanup stop');
      }
      if(state()!==null){
        cmd(nssm,['remove',serviceName,'confirm']);
        await until(()=>state()===null,'CI SCM removal');
      }
    }catch(e){error=e;console.error('Disposable SCM cleanup failed');}
  }
  if(state()!==null){throw error||Error('Service remained registered; retaining QA paths');}
  if(stagedApp)fs.rmSync(appRoot,{recursive:true,force:true});
  if(stagedData)fs.rmSync(dataRoot,{recursive:true,force:true});
  if(error)throw error;
}
(async()=>{
  let failure;
  try{await main();}catch(e){failure=e;console.error('Genuine Node agent SCM QA failed: '+e.message);}
  try{await cleanup();}catch(e){failure=failure||e;console.error('SCM QA cleanup incomplete');}
  if(failure)process.exitCode=1;
})().catch(()=>{console.error('Unhandled CI QA error');process.exitCode=1;});
