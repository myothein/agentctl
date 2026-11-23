#!/usr/bin/env node
'use strict';
// Disposable Windows SCM sibling-service probe. Never reads secret contents.
// The only attempted mutation is a synthetic CI SQLite file ACL, and the
// parent QA runner restores that ACL if the attempted change succeeds.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

function main(){
  const [flag,dbPath,resultPath]=process.argv.slice(2);
  if(process.platform!=='win32'||flag!=='--ci-sibling-probe'||
    typeof dbPath!=='string'||typeof resultPath!=='string'){
    throw Error('Refusing non-CI Windows sibling probe');
  }
  const db=path.win32.normalize(dbPath);
  const output=path.win32.normalize(resultPath);
  const expectedDb=path.win32.join(process.env.ProgramData||'C:\\ProgramData',
    'TenantAgent','runtime','data','outbox.db');
  const root=path.win32.join(process.env.ProgramData||'C:\\ProgramData');
  if(db.toLowerCase()!==expectedDb.toLowerCase()||
      !/^GTSP-SiblingQA_[0-9]{5,16}$/.test(path.win32.basename(path.win32.dirname(output)))||
      path.win32.dirname(path.win32.dirname(output)).toLowerCase()!==root.toLowerCase()||
      path.win32.basename(output)!=='result.json'){
    throw Error('Refusing a non-disposable Windows ACL target');
  }
  let readDenied=false;
  try{
    const fd=fs.openSync(db,'r');
    fs.closeSync(fd);
  }catch(error){
    if(error && (error.code==='EACCES'||error.code==='EPERM'))readDenied=true;
    else throw error;
  }
  // Attempt just a DACL change, never read file content. Windows file owner
  // implicit WRITE_DAC may otherwise let a sibling LocalService circumvent
  // per-service SID-only grants. A protected OWNER RIGHTS ACE must block this.
  const result=spawnSync('icacls.exe',[db,'/grant','*S-1-5-32-545:R'],{
    windowsHide:true,encoding:'utf8',timeout:12000,
    stdio:['ignore','pipe','pipe']
  });
  const daclDenied=!result.error && result.status!==0;
  fs.writeFileSync(output,JSON.stringify({readDenied,daclDenied})+'\n',{
    flag:'wx',encoding:'utf8'
  });
}
try{main();}catch{
  // No path, ACL descriptor, or file contents are written to logs.
  process.exitCode=1;
}
