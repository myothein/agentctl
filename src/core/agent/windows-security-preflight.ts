import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Read-only Windows ACL preflight. Does not grant permissions or touch SCM.
 * A secure deployment must provision directory ACLs before install.
 */
export type AclEntry = { sid:string; type:string; rights:number };
export type AclSnapshot = { reparse:boolean; entries:AclEntry[] };
export type AclClass = 'private' | 'code';

const privileged=new Set(['S-1-5-18','S-1-5-32-544']); // SYSTEM, Administrators
const synchronization=0x00100000;
const writeAccess=0x00000002 | 0x00000004 | 0x00000010 |
    0x00000020 | 0x00000040 | 0x00000100 | 0x00010000 |
    0x00040000 | 0x00080000 | 0x10000000 | 0x40000000;
const script=String.raw`
$ErrorActionPreference='Stop'
# Do not rely on PowerShell module autoload: CI runners may have restricted
# PSModulePath. Load the OS-shipped ACL provider by its trusted absolute path.
$securityModule=Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1'
Import-Module -Name $securityModule -ErrorAction Stop
$targets=ConvertFrom-Json -InputObject $env:GTSP_ACL_TARGETS
$result=@(foreach($p in $targets){
  $cursor=[IO.Path]::GetFullPath([string]$p)
  $reparse=$false
  while ($cursor) {
    $node=Get-Item -LiteralPath $cursor -Force -ErrorAction Stop
    if (($node.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      $reparse=$true
      break
    }
    $up=[IO.Path]::GetDirectoryName($cursor.TrimEnd('\'))
    if (-not $up -or $up -eq $cursor) { break }
    $cursor=$up
  }
  $a=Get-Acl -LiteralPath $p -ErrorAction Stop
  $rules=@(foreach ($r in $a.Access) {
    $sid=$r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    [pscustomobject]@{
      sid=$sid
      type=[string]$r.AccessControlType
      rights=[int]$r.FileSystemRights
    }
  })
  [pscustomobject]@{reparse=$reparse;entries=$rules}
})
ConvertTo-Json -InputObject $result -Depth 5 -Compress
`;

export function assertAclSnapshot(snapshot:AclSnapshot,kind:AclClass):void {
    if (!snapshot || typeof snapshot.reparse !== 'boolean' ||
        !Array.isArray(snapshot.entries) || snapshot.reparse ||
        snapshot.entries.length===0) {
        throw Error('Windows ACL preflight refused an invalid or redirected path');
    }
    let systemCanWrite=false;
    for(const row of snapshot.entries) {
        if(!row || typeof row.sid!=='string' ||
            !/^S-\d+(?:-\d+)+$/.test(row.sid) ||
            !['Allow','Deny'].includes(row.type) ||
            !Number.isInteger(row.rights)) {
            throw Error('Windows ACL preflight cannot interpret an access rule');
        }
        if(row.type!=='Allow')continue;
        const rights=row.rights >>> 0;
        if(row.sid==='S-1-5-18' && (rights & writeAccess)!==0) {
            systemCanWrite=true;
        }
        if(privileged.has(row.sid))continue;
        if(kind==='private') {
            if((rights & ~synchronization)!==0) {
                throw Error('Windows ACL preflight denied an untrusted private file or directory grant');
            }
        }else if((rights & writeAccess)!==0){
            throw Error('Windows ACL preflight denied an untrusted application write grant');
        }
    }
    if(kind==='private' && !systemCanWrite){
        throw Error('Windows ACL preflight requires SYSTEM write access');
    }
}

function inspectWindowsAclBatch(targets:string[]):AclSnapshot[] {
    if(process.platform!=='win32'){
        throw Error('Windows ACL preflight is only available on Windows');
    }
    const encoded=Buffer.from(script,'utf16le').toString('base64');
    const result=spawnSync('powershell.exe',[
        '-NoProfile','-NonInteractive','-EncodedCommand',encoded
    ],{
        windowsHide:true,encoding:'utf8',timeout:45000,
        env:{...process.env,GTSP_ACL_TARGETS:JSON.stringify(targets)},
        stdio:['ignore','pipe','pipe'],
        maxBuffer:512*1024
    });
    if(result.error || result.status!==0){
        // PowerShell may emit CLIXML progress records on stderr: do not treat
        // those as data or log their raw contents.
        let raw=result.stderr||'';
        for(const target of targets){raw=raw.split(target).join('<ACL target>');}
        const tail=raw.slice(-900).replace(/[^\x20-\x7E]/g,' ').slice(-450);
        const cause=result.error?.name ?? (result.status===null?'timeout':'provider');
        throw Error('Unable to verify Windows ACLs ('+cause+'; '+tail+'); no service change permitted');
    }
    try {
        const evidence=JSON.parse(result.stdout) as unknown;
        if(!Array.isArray(evidence) || evidence.length!==targets.length){
            throw Error('Unexpected ACL batch shape');
        }
        return evidence as AclSnapshot[];
    }catch{
        throw Error('Unable to parse Windows ACL evidence; no service change permitted');
    }
}

export type NodeServiceSecurityPaths = {
    nodeExe:string; entryFile:string; configFile:string;
    workingDir:string; nssmExe:string;
};

/** Must execute before the first NSSM status query; no path is changed here. */
export function verifyNodeServiceSecurity(options:NodeServiceSecurityPaths):void {
    const unique=new Map<string,AclClass>();
    const appDirectory=path.win32.dirname(path.win32.dirname(options.entryFile));
    const configDir=path.win32.dirname(options.configFile);
    const dataRoot=path.win32.dirname(options.workingDir);
    for(const p of [options.nodeExe,options.entryFile,
        path.win32.dirname(options.entryFile),appDirectory,options.nssmExe]){
        unique.set(p,'code');
    }
    for(const p of [options.configFile,configDir,
        options.workingDir,dataRoot]){
        unique.set(p,'private');
    }
    const evidence=inspectWindowsAclBatch([...unique.keys()]);
    let index=0;
    for(const kind of unique.values()){
        assertAclSnapshot(evidence[index++],kind);
    }
}
