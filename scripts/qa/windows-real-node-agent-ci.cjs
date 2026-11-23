#!/usr/bin/env node
'use strict';
// A real Node tenant-agent under genuine NSSM / Windows SCM on an ephemeral
// GitHub-hosted Windows runner. Never execute this on a local or production PC.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const child=require('node:child_process');
const crypto=require('node:crypto');
const http=require('node:http');
const {installNewService}=require('../../dist/core/agent/safe-install.js');
const {verifyNodeServiceSecurity,verifyNodeSqliteArtifacts,resolveWindowsServiceSid}=require('../../dist/core/agent/windows-security-preflight.js');

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
const serviceSid=resolveWindowsServiceSid(serviceName);
const programFiles=process.env.ProgramFiles||'C:\\Program Files';
const programData=process.env.ProgramData||'C:\\ProgramData';
const appRoot=path.join(programFiles,'TenantAgent','app');
const binDir=path.join(programFiles,'TenantAgent','bin');
const trustedNode=path.join(binDir,'node.exe');
const trustedNssm=path.join(binDir,'nssm.exe');
const distPath=path.join(appRoot,'dist');
const entry=path.join(distPath,'index.js');
const dataRoot=path.join(programData,'TenantAgent');
const workDir=path.join(dataRoot,'runtime');
const configDir=path.join(dataRoot,'config');
const configFile=path.join(configDir,'agentci_'+id+'.env');
const source=path.resolve('integration','tenant-agent');
const Database=require(path.join(source,'node_modules','better-sqlite3'));
const tenantId='tenant_ci_qa';
const tenantKey='ci-only-agent-local-token-longer-than-32-bytes';
const centralKey='ci-only-central-local-token-longer-than-32-bytes';
const eventId=crypto.randomUUID();
const occurredAt=new Date().toISOString();
const sourceEvent={
  id:eventId,tenant_code:tenantId,agent_id:'tenant-service',
  aggregate_type:'Subject',aggregate_id:'101',event_type:'subject.created',
  payload:{id:101,name:'Synthetic SCM subject'},created_at:occurredAt,
  occurred_at:occurredAt,retry_count:0,event_version:1
};
let sourceMarked=false,centralOnline=false,duplicateCount=0;
const centralEvents=new Map();
let tenantServer,centralServer;
const nssm=process.env.NSSM_EXE;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let serviceReserved=false,stagedApp=false,stagedData=false;
let serviceNssm=nssm;

function cmd(exe,args,allowFailure=false){
  const r=child.spawnSync(exe,args,{encoding:'utf8',windowsHide:true,timeout:20000,
    stdio:['ignore','pipe','pipe']});
  if((r.error||r.status!==0)&&!allowFailure){
    throw Error('Windows QA command failed: '+path.basename(exe)+' ('+
      (r.status===null?'unknown':r.status)+')');
  }
  return r;
}
function grantServiceSidAcl(target,right){
  // A service-specific SID may not yet be registered as an account. icacls
  // can fail 1332 on pre-install SID name lookup, so write the SID object
  // directly to a discretionary NTFS ACL without weakening fail-closed install.
  assert(/^(Read|Modify)$/.test(right));
  const script=String.raw`
$ErrorActionPreference='Stop'
$module=Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1'
Import-Module -Name $module -ErrorAction Stop
$p=$env:GTSP_ACL_FILE
$sid=[Security.Principal.SecurityIdentifier]::new($env:GTSP_SERVICE_SID)
$acl=Get-Acl -LiteralPath $p -ErrorAction Stop
$item=Get-Item -LiteralPath $p -Force -ErrorAction Stop
$flags=[Security.AccessControl.InheritanceFlags]::None
if($item.PSIsContainer){
  $flags=[Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
    [Security.AccessControl.InheritanceFlags]::ObjectInherit
}
$rule=[Security.AccessControl.FileSystemAccessRule]::new(
  $sid,[Security.AccessControl.FileSystemRights]$env:GTSP_ACL_RIGHT,
  $flags,[Security.AccessControl.PropagationFlags]::None,
  [Security.AccessControl.AccessControlType]::Allow)
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $p -AclObject $acl -ErrorAction Stop
`;
  const result=child.spawnSync('powershell.exe',[
    '-NoProfile','-NonInteractive','-EncodedCommand',
    Buffer.from(script,'utf16le').toString('base64')
  ],{
    windowsHide:true,encoding:'utf8',timeout:15000,
    env:{...process.env,GTSP_ACL_FILE:target,GTSP_SERVICE_SID:serviceSid,
      GTSP_ACL_RIGHT:right},
    stdio:['ignore','pipe','pipe']
  });
  if(result.error||result.status!==0){
    throw Error('Windows CI could not pre-provision a service-specific SID ACL');
  }
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
function reply(res,status,data){
  res.writeHead(status,{'content-type':'application/json'});
  res.end(JSON.stringify(data));
}
async function readBody(req){
  let body='';
  for await(const chunk of req){
    body+=chunk.toString('utf8');
    if(body.length>65536)throw Error('Overlong synthetic payload');
  }
  return JSON.parse(body||'{}');
}
async function bind(server){
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  return 'http://127.0.0.1:'+server.address().port;
}
function outboxRow(){
  const p=path.join(workDir,'data','outbox.db');
  if(!fs.existsSync(p))return null;
  const db=new Database(p,{readonly:true});
  try{
    return db.prepare('SELECT id,tenantId,sent,retry_count FROM outbox WHERE id=?')
      .get(eventId)||null;
  }finally{db.close();}
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
  fs.mkdirSync(binDir,{recursive:true});
  fs.copyFileSync(process.execPath,trustedNode);
  // Chocolatey shims may delegate to a package binary. Prefer the pinned
  // actual win64 NSSM payload, then stage and hash-check it in Program Files.
  function findBundledNssm(){
    const root=path.join(programData,'chocolatey','lib','nssm','tools');
    if(!fs.existsSync(root))return nssm;
    const found=[];
    function visit(folder,depth){
      if(depth>4)return;
      for(const item of fs.readdirSync(folder,{withFileTypes:true})){
        const candidate=path.join(folder,item.name);
        if(item.isDirectory())visit(candidate,depth+1);
        else if(item.isFile()&&item.name.toLowerCase()==='nssm.exe')found.push(candidate);
      }
    }
    visit(root,0);
    return found.find(p=>/win64/i.test(p))||found[0]||nssm;
  }
  const sourceNssm=findBundledNssm();
  fs.copyFileSync(sourceNssm,trustedNssm);
  serviceNssm=trustedNssm;
  // The GitHub toolcache Node path is intentionally writable by CI accounts,
  // so it fails the application integrity ACL gate. Stage an identical verified
  // Node binary in the restricted Program Files test app instead.
  const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(digest(trustedNode),digest(process.execPath),
    'Copied Node 22 runtime hash does not match the exact CI source');
  assert.equal(digest(trustedNssm),digest(sourceNssm),
    'Staged pinned NSSM hash does not match its pinned CI package');
  fs.cpSync(path.join(source,'dist'),distPath,{recursive:true});
  fs.copyFileSync(path.join(source,'package.json'),path.join(appRoot,'package.json'));
  fs.cpSync(path.join(source,'node_modules'),path.join(appRoot,'node_modules'),{
    recursive:true,dereference:true
  });
  fs.mkdirSync(workDir,{recursive:true});stagedData=true;
  fs.mkdirSync(configDir,{recursive:true});
  tenantServer=http.createServer(async(req,res)=>{
    try{
      if(req.headers.authorization!=='Bearer '+tenantKey){
        reply(res,401,{success:false});return;
      }
      if(req.method==='GET'&&req.url==='/local-events/pending'){
        reply(res,200,{success:true,data:sourceMarked?[]:[sourceEvent]});return;
      }
      if(req.method==='PATCH'&&req.url==='/local-events/'+eventId+'/mark-sent'){
        sourceMarked=true;reply(res,200,{success:true});return;
      }
      reply(res,404,{success:false});
    }catch{reply(res,500,{success:false});}
  });
  centralServer=http.createServer(async(req,res)=>{
    try{
      if(req.headers.authorization!=='Bearer '+centralKey){
        reply(res,401,{success:false});return;
      }
      if(req.method==='POST'&&req.url==='/api/v1/heartbeats'){
        reply(res,200,{success:true,status:'recorded'});return;
      }
      if(req.method==='POST'&&req.url==='/api/v1/events'){
        const event=await readBody(req);
        if(event.id!==eventId||event.tenantId!==tenantId){
          reply(res,400,{success:false});return;
        }
        if(!centralOnline){
          reply(res,503,{success:false});return;
        }
        if(centralEvents.has(event.id)){
          duplicateCount++;
          reply(res,200,{success:true,status:'duplicate',eventId});return;
        }
        centralEvents.set(event.id,event);
        reply(res,201,{success:true,status:'accepted',eventId});return;
      }
      reply(res,404,{success:false});
    }catch{reply(res,500,{success:false});}
  });
  const tenantUrl=await bind(tenantServer);
  const centralUrl=await bind(centralServer);
  fs.writeFileSync(configFile,[
    'TENANT_ID=tenant_ci_qa',
    'TENANT_API_URL='+tenantUrl,
    'SYSTEM_API_URL='+centralUrl,
    'TENANT_AGENT_API_KEY=ci-only-agent-local-token-longer-than-32-bytes',
    'CENTRAL_AGENT_API_KEY=ci-only-central-local-token-longer-than-32-bytes',
    'TENANT_SYNC_INTERVAL_MS=1000',
    'TENANT_HEARTBEAT_INTERVAL_MS=1000'
  ].join('\n')+'\n',{flag:'wx',mode:0o600});

  // Windows POSIX mode 0600 is NOT an NTFS ACL. Explicitly remove inherited
  // group grants and allow only SYSTEM + local Administrators on CI private data.
  for(const p of [dataRoot,workDir,configDir,configFile,
    appRoot,distPath,entry,binDir,trustedNode,trustedNssm]){
    cmd('icacls.exe',[p,'/inheritance:r']);
    cmd('icacls.exe',[p,'/grant:r',
      '*S-1-5-18:(OI)(CI)F'.replace(':(OI)(CI)F',
        fs.statSync(p).isDirectory()?':(OI)(CI)F':':F'),
      '*S-1-5-32-544:(OI)(CI)F'.replace(':(OI)(CI)F',
        fs.statSync(p).isDirectory()?':(OI)(CI)F':':F')
    ]);
  }
  // Grant the actual low-privilege service identity only the permissions it
  // needs. No LocalService write permission is granted on executable code.
  const localService='*S-1-5-19';
  // Service-specific SID is the only nonprivileged private data principal.
  for(const p of [configDir,configFile])grantServiceSidAcl(p,'Read');
  for(const p of [dataRoot,workDir])grantServiceSidAcl(p,'Modify');
  for(const p of [appRoot,distPath,binDir]){
    cmd('icacls.exe',[p,'/grant',localService+':(OI)(CI)RX']);
  }
  for(const p of [entry,trustedNode,trustedNssm]){
    cmd('icacls.exe',[p,'/grant',localService+':RX']);
  }
  const verifiedSecurity=o=>verifyNodeServiceSecurity({
    nodeExe:o.agentExe,entryFile:o.nodeAgent.entryFile,
    workingDir:o.nodeAgent.workingDir,configFile:o.configFile,
    nssmExe:o.nssmExe,serviceAccount:o.nodeAgent.serviceAccount,
    serviceSid:o.nodeAgent.serviceSid
  });
  const installer={
    serviceName,agentExe:trustedNode,ctlExe:trustedNode,
    nssmExe:serviceNssm,binDir:appRoot,configFile,
    nodeAgent:{entryFile:entry,workingDir:workDir,runtimeVersion:process.version,
      serviceAccount:'NT AUTHORITY\\LocalService',serviceSid},
    fileExists:fs.existsSync,
    verifyNodeSecurity:verifiedSecurity,
    configureServiceSid:async name=>{
      assert.equal(name,serviceName,'SID setup may only target the QA service');
      cmd('sc.exe',['sidtype',name,'unrestricted']);
      assert.match(cmd('sc.exe',['qsidtype',name]).stdout,
        /SERVICE_SID_TYPE\s*:\s*UNRESTRICTED/i,
        'Actual SCM must report UNRESTRICTED service-specific SID type');
    },
    run:async args=>{
      const r=cmd(serviceNssm,args,true);
      return {code:r.error?1:(r.status===null?1:r.status),
        stdout:r.stdout||'',stderr:r.stderr||''};
    }
  };
  // Negative security acceptance: read access by BUILTIN\Users must block the
  // installation before any NSSM or SCM invocation, not merely warn.
  cmd('icacls.exe',[configFile,'/grant','*S-1-5-32-545:R']);
  const calls=[];
  await assert.rejects(
    ()=>installNewService({...installer,run:async args=>{
      calls.push(args);throw Error('SCM must not be contacted');
    }}),
    /untrusted private/
  );
  assert.equal(calls.length,0,'World-readable secret file reached NSSM');
  cmd('icacls.exe',[configFile,'/remove','*S-1-5-32-545']);
  verifiedSecurity(installer);

  serviceReserved=true;
  await installNewService(installer);
  // Verify the *actual SCM account*, not only what our installer attempted.
  const serviceConfig=cmd('sc.exe',['qc',serviceName]).stdout;
  assert.match(serviceConfig,/SERVICE_START_NAME\s*:\s*NT AUTHORITY\\LocalService/i,
    'Service identity must be LocalService; default LocalSystem is prohibited');
  assert.match(cmd('sc.exe',['qsidtype',serviceName]).stdout,
    /SERVICE_SID_TYPE\s*:\s*UNRESTRICTED/i,
    'Windows service SID must be enabled in actual SCM');
  assert.equal(state(),'STOPPED','Installer must use demand-start, not auto-start');
  const params=cmd(serviceNssm,['get',serviceName,'AppParameters']).stdout;
  assert(params.includes('--env-file=')&&params.includes('index.js'),
    'NSSM did not retain reviewed Node arguments');
  assert(!params.includes('ci-only-'),'NSSM parameters contain synthetic secret');

  cmd('sc.exe',['start',serviceName]);
  await until(()=>state()==='RUNNING','actual Node.js service RUNNING');
  const dbPath=path.join(workDir,'data','outbox.db');
  await until(()=>fs.existsSync(dbPath)&&fs.statSync(dbPath).size>0,
    'genuine tenant-agent SQLite initialization',20000);
  await until(()=>sourceMarked&&outboxRow()?.sent===0&&outboxRow()?.retry_count>=1,
    'outbox pending while Central is unavailable',20000);
  assert(verifyNodeSqliteArtifacts(workDir,serviceSid).includes('outbox.db'),
    'Live SQLite data must be restricted by real NTFS ACLs');
  assert.equal(centralEvents.size,0,'Offline mode must never fake central delivery');
  cmd('sc.exe',['stop',serviceName]);
  await until(()=>state()==='STOPPED','actual Node.js service STOPPED');
  assert(fs.existsSync(dbPath),'Stopped service unexpectedly deleted SQLite outbox');
  assert.equal(outboxRow()?.sent,0,'Unacknowledged event must survive SCM stop');
  // A database created at runtime must not accidentally become world-readable.
  // Exercise actual icacls/PowerShell ACLs after stop, BEFORE restarting SCM.
  verifyNodeSqliteArtifacts(workDir,serviceSid);
  cmd('icacls.exe',[dbPath,'/grant','*S-1-5-32-545:R']);
  assert.throws(()=>verifyNodeSqliteArtifacts(workDir,serviceSid),/SQLite runtime ACL preflight denied/,
    'BUILTIN\\Users may not read an offline tenant SQLite database');
  cmd('icacls.exe',[dbPath,'/remove','*S-1-5-32-545']);
  assert(verifyNodeSqliteArtifacts(workDir,serviceSid).includes('outbox.db'),
    'Restored private database ACL must pass before service restart');

  centralOnline=true;
  cmd('sc.exe',['start',serviceName]);
  await until(()=>state()==='RUNNING','actual Node.js service restart');
  await until(()=>centralEvents.size===1&&outboxRow()?.sent===1,
    'offline event delivery after SCM restart',20000);
  assert.equal(centralEvents.get(eventId)?.payload?.id,101);

  // Simulate an interruption after Central has persisted the event but before
  // the local SQLite acknowledgement could be committed.
  cmd('sc.exe',['stop',serviceName]);
  await until(()=>state()==='STOPPED','SCM stop before duplicate retry');
  const db=new Database(dbPath);
  try{
    db.prepare("UPDATE outbox SET sent=0,status='pending' WHERE id=?").run(eventId);
  }finally{db.close();}
  cmd('sc.exe',['start',serviceName]);
  await until(()=>state()==='RUNNING','SCM restart before replay');
  await until(()=>duplicateCount>=1&&outboxRow()?.sent===1,
    'idempotent central replay after SCM restart');
  assert(verifyNodeSqliteArtifacts(workDir,serviceSid).includes('outbox.db'),
    'Post-replay SQLite ACLs must remain restricted');
  assert.equal(centralEvents.size,1,'Duplicate retry must not duplicate central events');
  console.log('PASS genuine Node 22 tenant-agent: NSSM/SCM lifecycle, offline durable SQLite, restart delivery and idempotent replay');
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
        cmd(serviceNssm,['remove',serviceName,'confirm']);
        await until(()=>state()===null,'CI SCM removal');
      }
    }catch(e){error=e;console.error('Disposable SCM cleanup failed');}
  }
  for(const server of [tenantServer,centralServer]){
    if(server?.listening){
      try{await new Promise((resolve,reject)=>
        server.close(e=>e?reject(e):resolve()));}
      catch(e){error=error||e;}
    }
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
