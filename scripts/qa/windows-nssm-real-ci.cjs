#!/usr/bin/env node
'use strict';

// Runs ONLY on disposable GitHub-hosted Windows runners in a same-repo PR.
// Installs ONLY a unique GTSPAgentCtlQA_ service, NEVER a production agent.
// All created services/files are removed in the finally block.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const child = require('node:child_process');
const assert = require('node:assert/strict');
const { runStagedSignedUpdate } = require('../../dist/core/agent/staged-service-update.js');
const { manifestSigningMessage } = require('../../dist/core/agent/signed-update.js');

function required(condition, message) {
  if (!condition) throw Error(message);
}
required(process.platform === 'win32' && process.env.CI === 'true' &&
  process.env.RUNNER_OS === 'Windows' && process.env.RUNNER_ENVIRONMENT === 'github-hosted',
  'Refusing to run outside GitHub-hosted Windows CI');
required(/^[0-9]{5,16}$/.test(process.env.GITHUB_RUN_ID || ''),
  'Missing valid GitHub run identifier');
required((process.env.GITHUB_HEAD_REF || '') === 'hardening/release-security-baseline-20261122',
  'Service QA runs only from the approved Draft PR branch');

const name = 'GTSPAgentCtlQA_' + process.env.GITHUB_RUN_ID;
const root = path.join(process.env.ProgramData || 'C:\\ProgramData',name);
const worker = path.join(root,'worker.js');
const signal = path.join(root,'health.json');
const backup = path.join(root,'worker.verified-backup');
let installedByThisJob = false;
let rootCreatedByThisJob = false;
const delay = ms=>new Promise(resolve=>setTimeout(resolve,ms));

function command(exe, args, timeout=30000) {
  const result=child.spawnSync(exe,args,{
    encoding:'utf8',windowsHide:true,timeout,
    stdio:['ignore','pipe','pipe']
  });
  if(result.error || result.status !== 0) {
    const code=result.status ?? (result.error && result.error.code) ?? '?';
    throw Error('Windows command '+path.basename(exe)+' failed (code '+code+')');
  }
  return result.stdout.trim();
}
function queryState() {
  const result=child.spawnSync('sc.exe',['query',name],{
    encoding:'utf8',windowsHide:true,timeout:10000
  });
  if(result.status !== 0) return null;
  const match=/STATE\s*:\s*\d+\s+([A-Z_]+)/.exec(result.stdout);
  if(!match) throw Error('Unknown Windows SCM state format');
  return match[1];
}
async function waitState(allowed,timeoutMs=25000) {
  const end=Date.now()+timeoutMs;
  while(Date.now()<end){
    const state=queryState();
    if(allowed.includes(state)) return state;
    await delay(250);
  }
  throw Error('SCM did not enter expected state in time: '+allowed.join(','));
}
function workerSource(version) {
  const tag=JSON.stringify(version);
  if(version === 'broken') return "'use strict'; process.exit(23);\n";
  return "'use strict';\n"+
    "const fs=require('node:fs');\n"+
    "const file=process.argv[2];\n"+
    "function beat(){fs.writeFileSync(file,JSON.stringify({version:"+tag+",at:Date.now()}));}\n"+
    "beat();setInterval(beat,300);\n"+
    "process.on('SIGTERM',()=>process.exit(0));\n"+
    "process.on('SIGINT',()=>process.exit(0));\n";
}
async function healthy(expected,timeoutMs=12000) {
  const end=Date.now()+timeoutMs;
  while(Date.now()<end){
    if(queryState()==='RUNNING' && fs.existsSync(signal)){
      try{
        const data=JSON.parse(fs.readFileSync(signal,'utf8'));
        if(data.version===expected && Number.isFinite(data.at) &&
           Math.abs(Date.now()-data.at)<4000) return true;
      } catch {}
    }
    await delay(250);
  }
  return false;
}
function safeSyncWrite(filename,bytes) {
  const fd=fs.openSync(filename,'w',0o600);
  try {fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}
  finally {fs.closeSync(fd);}
}
function signatureFor(binary,version,key) {
  const hash=crypto.createHash('sha256').update(binary).digest('hex');
  const signature=crypto.sign(null,manifestSigningMessage(version,hash),key).toString('base64');
  return {schemaVersion:1,version,sha256:hash,signature};
}

async function main(){
  const existing=queryState();
  required(existing===null,'CI service name already exists; refusing to touch it');
  required(!fs.existsSync(root),'CI workspace already exists; refusing to touch it');
  fs.mkdirSync(root,{recursive:false});
  rootCreatedByThisJob=true;
  const old=Buffer.from(workerSource('qa-v1'),'utf8');
  safeSyncWrite(worker,old);
  const nssm=process.env.NSSM_EXE;
  required(nssm && fs.existsSync(nssm),'Pinned NSSM executable is missing');
  required(fs.existsSync(process.execPath),'Node executable missing');
  command(nssm,['install',name,process.execPath,worker,signal]);
  installedByThisJob=true;
  command(nssm,['set',name,'AppDirectory',root]);
  command(nssm,['set',name,'Start','SERVICE_DEMAND_START']);
  command(nssm,['set',name,'AppExit','Default','Exit']);

  // Genuine Windows Service Controller transitions (not injected mocks).
  command('sc.exe',['start',name]);
  await waitState(['RUNNING']);
  required(await healthy('qa-v1'),'New QA service did not produce fresh heartbeat');
  command('sc.exe',['stop',name]);
  await waitState(['STOPPED']);
  required(fs.existsSync(worker),'SCM stop unexpectedly deleted installed artifact');
  command('sc.exe',['start',name]);
  await waitState(['RUNNING']);
  required(await healthy('qa-v1'),'QA service failed restart');

  // Simulated update bytes and ephemeral CI-only signing key: NO production secrets.
  const key=crypto.generateKeyPairSync('ed25519');
  const publicKey=key.publicKey.export({type:'spki',format:'pem'}).toString();
  let desired='qa-v1';
  let updateReads=0;
  const ops={
    approved:true,
    async isServiceRunning(){return queryState()==='RUNNING';},
    async readInstalled(){return fs.readFileSync(worker);},
    async writeBackup(bytes){safeSyncWrite(backup,bytes);},
    async readBackup(){updateReads++;return fs.readFileSync(backup);},
    async stopService(){
      command('sc.exe',['stop',name]);
      await waitState(['STOPPED']);
    },
    async replaceInstalled(bytes){
      safeSyncWrite(worker,bytes);desired='qa-v2';
    },
    async startService(){
      fs.rmSync(signal,{force:true});
      command('sc.exe',['start',name]);
      await waitState(['RUNNING']);
    },
    async healthCheck(){return healthy(desired,8000);},
    async restoreInstalled(bytes){
      safeSyncWrite(worker,bytes);desired='qa-v2';
    }
  };
  const good=Buffer.from(workerSource('qa-v2'),'utf8');
  await runStagedSignedUpdate(good,signatureFor(good,'2.0.0',key.privateKey),publicKey,ops);
  assert(await healthy('qa-v2'),'QA signed update failed service health gate');
  assert(updateReads>=1,'Signed upgrade did not read independently created backup');

  // Distinct, correctly signed but operationally broken version; rollback must
  // restore exactly the previous v2 worker, not merely mark test success.
  const broken=Buffer.from(workerSource('broken'),'utf8');
  const v2Digest=crypto.createHash('sha256').update(fs.readFileSync(worker)).digest('hex');
  const failOps={...ops,
    async replaceInstalled(bytes){safeSyncWrite(worker,bytes);desired='broken';},
    async restoreInstalled(bytes){safeSyncWrite(worker,bytes);desired='qa-v2';}
  };
  await assert.rejects(
    ()=>runStagedSignedUpdate(
      broken,signatureFor(broken,'3.0.0',key.privateKey),publicKey,failOps
    ),
    /restored and healthy/
  );
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(worker)).digest('hex'),
    v2Digest,'Rollback did not restore exact original binary');
  assert(await healthy('qa-v2'),'Original service not healthy after rollback');

  // Verify invalid release signature NEVER stopped the Windows service.
  const other=crypto.generateKeyPairSync('ed25519');
  await assert.rejects(
    ()=>runStagedSignedUpdate(good,signatureFor(good,'2.1.0',other.privateKey),publicKey,ops),
    /signature/
  );
  assert(await healthy('qa-v2'),'Unsigned/foreign-signer attempt disrupted service');
  console.log('PASS genuine NSSM/SCM: QA install, start, stop, restart, signed upgrade, unhealthy rollback, signer denial');
}

async function cleanup(){
  let failed=false;
  if(installedByThisJob){
    try{
      const state=queryState();
      if(state && state!=='STOPPED'){
        command('sc.exe',['stop',name]); await waitState(['STOPPED'],20000);
      }
      command(process.env.NSSM_EXE,['remove',name,'confirm']);
      await waitState([null],20000);
    }catch(error){
      failed=true;
      console.error('QA service cleanup failed. Exact QA name: '+name);
    }
  }
  if(rootCreatedByThisJob){
    try{
      if(queryState() === null){
        fs.rmSync(root,{recursive:true,force:true});
      } else {
        failed=true;
        console.error('QA service remains registered; workspace retained for CI investigation');
      }
    }catch{failed=true;console.error('QA workspace cleanup failed');}
  }
  if(failed)throw Error('Windows QA cleanup incomplete');
}

(async()=>{
  let error;
  try{await main();}
  catch(e){error=e;console.error('Real Windows NSSM lifecycle QA FAILED: '+e.message);}
  try{await cleanup();}
  catch(e){error=error||e;}
  if(error){process.exitCode=1;}
})().catch(()=>{console.error('Unexpected Windows QA error');process.exitCode=1;});
