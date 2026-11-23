import path from 'node:path';
import fs from 'node:fs';
import { readEnvFile } from '../../utils/env-config';
import { spawnSync } from 'node:child_process';

/**
 * Read-only Windows ACL preflight. Does not grant permissions or touch SCM.
 * A secure deployment must provision directory ACLs before install.
 */
export type AclEntry = { sid:string; type:string; rights:number };
export type AclSnapshot = { reparse:boolean; entries:AclEntry[] };
export type AclClass = 'private' | 'code' | 'service-config' | 'service-runtime';

const privileged=new Set(['S-1-5-18','S-1-5-32-544']); // SYSTEM, Administrators
const serviceSidPattern=/^S-1-5-80-(?:[0-9]{1,10}-){4}[0-9]{1,10}$/;
const ownerRightsSid='S-1-3-4'; // Windows OWNER RIGHTS: suppresses owner's implicit WRITE_DAC
const ownerReadControl=0x00020000;
const synchronization=0x00100000;
const writeAccess=0x00000002 | 0x00000004 | 0x00000010 |
    0x00000040 | 0x00000100 | 0x00010000 |
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
    $sid=[string]$r.IdentityReference.Value
    try {
      $sid=$r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    } catch [Security.Principal.IdentityNotMappedException] {
      if ($sid -notmatch '^S-\d+(?:-\d+)+$') { $sid='S-1-0-0' }
    }
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

export function assertAclSnapshot(snapshot:AclSnapshot,kind:AclClass,serviceSid?:string):void {
    if((kind==='service-config'||kind==='service-runtime') &&
       (typeof serviceSid!=='string'||!serviceSidPattern.test(serviceSid))){
        throw Error('Validated per-service SID required for private service resources');
    }
    if (!snapshot || typeof snapshot.reparse !== 'boolean' ||
        !Array.isArray(snapshot.entries) || snapshot.reparse ||
        snapshot.entries.length===0) {
        throw Error('Windows ACL preflight refused an invalid or redirected path');
    }
    let systemCanWrite=false;
    let serviceHasRequiredAccess=false;
    let ownerRightsProtected=false;
    for(const row of snapshot.entries) {
        if(!row || typeof row.sid!=='string' ||
            !/^S-\d+(?:-\d+)+$/.test(row.sid) ||
            !['Allow','Deny'].includes(row.type) ||
            !Number.isInteger(row.rights)) {
            throw Error('Windows ACL preflight cannot interpret an access rule');
        }
        if(row.sid===serviceSid && row.type==='Deny' &&
            (kind==='service-config'||kind==='service-runtime')) {
            throw Error('Windows service account is explicitly denied required access');
        }
        if(row.type!=='Allow')continue;
        const rights=row.rights >>> 0;
        if(row.sid===ownerRightsSid &&
           (kind==='service-config'||kind==='service-runtime')) {
            // Without this explicit OWNER RIGHTS ACE, a LocalService-owned
            // SQLite file gives *every* process with that same account SID
            // implicit WRITE_DAC, even if its DACL lacks the foreign SID.
            if((rights & ownerReadControl)===0 ||
               (rights & ~(ownerReadControl|synchronization))!==0){
                throw Error('Windows OWNER RIGHTS must not grant WRITE_DAC or data access');
            }
            ownerRightsProtected=true;
            continue;
        }
        if(row.sid==='S-1-5-18' && (rights & writeAccess)!==0) {
            systemCanWrite=true;
        }
        if(privileged.has(row.sid))continue;
        if(row.sid===serviceSid &&
           (kind==='service-config'||kind==='service-runtime')) {
            if(kind==='service-config'){
                if((rights & writeAccess)!==0) {
                    throw Error('Service SID must not write tenant agent configuration');
                }
                if((rights & 0x1)!==0)serviceHasRequiredAccess=true;
            }else{
                // Runtime must read/write its SQLite data but may not take ownership,
                // change file ACLs or get full-control generic permissions.
                if((rights & (0x00040000|0x00080000|0x10000000|0x40000000))!==0){
                    throw Error('Service SID runtime permission escalation refused');
                }
                if((rights & 0x3)===0x3)serviceHasRequiredAccess=true;
            }
            continue;
        }
        if(kind==='private'||kind==='service-config'||kind==='service-runtime') {
            if((rights & ~synchronization)!==0) {
                throw Error('Windows ACL preflight denied an untrusted private file or directory grant');
            }
        }else if((rights & writeAccess)!==0){
            throw Error('Windows ACL preflight denied an untrusted application write grant');
        }
    }
    if(kind!=='code' && !systemCanWrite){
        throw Error('Windows ACL preflight requires SYSTEM write access');
    }
    if((kind==='service-config'||kind==='service-runtime') && !serviceHasRequiredAccess){
        throw Error('Windows ACL preflight requires explicit per-service SID grant');
    }
    if((kind==='service-config'||kind==='service-runtime') && !ownerRightsProtected){
        throw Error('Windows ACL preflight requires OWNER RIGHTS to block implicit owner WRITE_DAC');
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
        // Fail closed; do not log ACL contents, file paths, accounts or secrets.
        throw Error('Unable to verify Windows ACLs; no service change permitted');
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
    serviceAccount:'NT AUTHORITY\\LocalService';
    serviceSid:string;
};

/** Must execute before the first NSSM status query; no path is changed here. */
export function verifyNodeServiceSecurity(options:NodeServiceSecurityPaths):void {
    if(options.serviceAccount!=='NT AUTHORITY\\LocalService'){
        throw Error('Windows Node service must use the verified LocalService account');
    }
    if(!serviceSidPattern.test(options.serviceSid)){
        throw Error('Windows Node service requires the validated service-specific SID');
    }
    const unique=new Map<string,AclClass>();
    const appDirectory=path.win32.dirname(path.win32.dirname(options.entryFile));
    const configDir=path.win32.dirname(options.configFile);
    const dataRoot=path.win32.dirname(options.workingDir);
    const roles=new Map<string,string>();
    for(const [p,role] of [
        [options.configFile,'secret config'],
        [configDir,'config directory'],
        [options.workingDir,'runtime directory'],
        [dataRoot,'runtime data root'],
    ]){
        unique.set(p,role==='runtime directory'||role==='runtime data root'?'service-runtime':'service-config');
        roles.set(p,role);
    }
    for(const [p,role] of [
        [options.nodeExe,'Node executable'],
        [options.entryFile,'agent entry'],
        [path.win32.dirname(options.entryFile),'compiled output directory'],
        [appDirectory,'application directory'],
        [options.nssmExe,'NSSM executable']
    ]){
        unique.set(p,'code');
        roles.set(p,role);
    }
    const evidence=inspectWindowsAclBatch([...unique.keys()]);
    let index=0;
    for(const [p,kind] of unique){
        try {
            assertAclSnapshot(evidence[index++],kind,options.serviceSid);
        }catch(error) {
            const reason=error instanceof Error?error.message:'invalid ACL';
            throw Error('Windows ACL '+roles.get(p)+': '+reason);
        }
    }
}


/**
 * Post-start verification of generated SQLite data. The installer cannot check
 * files before the agent creates them; this is a separate read-only release gate.
 * Check existing WAL/SHM sidecars when present, and re-check after restarts.
 */
export function verifyNodeSqliteArtifacts(workingDir:string,serviceSid:string):string[] {
    if(!serviceSidPattern.test(serviceSid))throw Error('SQLite artifact check requires per-service SID');
    if(process.platform!=='win32'){
        throw Error('Windows SQLite ACL QA is available only on Windows');
    }
    if(typeof workingDir!=='string' ||
       !/^[A-Za-z]:\\/.test(workingDir) ||
       workingDir!==path.win32.normalize(workingDir) ||
       !workingDir.toLowerCase().includes('\\programdata\\tenantagent\\runtime')) {
        throw Error('Invalid Windows SQLite runtime directory');
    }
    const dataDir=path.win32.join(workingDir,'data');
    const db=path.win32.join(dataDir,'outbox.db');
    if(!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory() ||
       !fs.existsSync(db) || !fs.statSync(db).isFile()) {
        throw Error('Required SQLite database or data directory missing');
    }
    const candidates=[dataDir,db,db+'-wal',db+'-shm'];
    const existing=candidates.filter(p=>fs.existsSync(p));
    const snapshots=inspectWindowsAclBatch(existing);
    for(let i=0;i<existing.length;i++){
        try {
            assertAclSnapshot(snapshots[i],'service-runtime',serviceSid);
        }catch{
            // Never expose the live database path or ACL contents in logs.
            throw Error('SQLite runtime ACL preflight denied a generated artifact');
        }
    }
    return existing.map(p=>path.win32.basename(p));
}


/**
 * Obtain the Windows-computed per-service SID for a fixed, validated service
 * name before registration. sc.exe showsid does not create a service.
 */
export function resolveWindowsServiceSid(serviceName:string):string {
    if(process.platform!=='win32'||! /^[a-zA-Z0-9_-]{1,64}$/.test(serviceName)){
        throw Error('Invalid Windows service name for SID resolution');
    }
    const r=spawnSync('sc.exe',['showsid',serviceName],{
        windowsHide:true,encoding:'utf8',timeout:5000,
        stdio:['ignore','pipe','pipe'],maxBuffer:32*1024
    });
    if(r.error||r.status!==0){
        throw Error('Could not resolve Windows per-service SID');
    }
    const matches=(r.stdout||'').match(/S-1-5-80-(?:\d{1,10}-){4}\d{1,10}/g)||[];
    if(matches.length!==1 || !serviceSidPattern.test(matches[0])){
        throw Error('Windows service SID output was invalid or ambiguous');
    }
    return matches[0];
}


/**
 * The Node tenant-agent requires NODE_ENV=production and an explicitly
 * pre-provisioned backup directory, outside both its working and install
 * trees. Validate this before any NSSM/SCM operation. Path checks are pure
 * and cross-platform using Windows path semantics; ACL checks remain Windows
 * only. Never include path or secret contents in thrown diagnostics.
 */
export function assertNodeBackupLocation(
    environment: unknown,
    backupPath: unknown,
    entryFile: string,
    workingDir: string
): string {
    if (environment !== 'production' ||
        typeof backupPath !== 'string' || backupPath.length < 4 ||
        backupPath.length > 240 ||
        !/^[A-Za-z]:\\/.test(backupPath) ||
        backupPath !== path.win32.normalize(backupPath) ||
        /[\x00-\x1f"<>|?*]/.test(backupPath)) {
        throw Error('Node agent production backup configuration is invalid');
    }
    const backup = path.win32.resolve(backupPath);
    const installRoot = path.win32.dirname(path.win32.dirname(
        path.win32.dirname(entryFile)));
    const isWithin = (candidate: string, root: string): boolean => {
        const relative = path.win32.relative(root, candidate);
        return relative === '' ||
            (relative !== '..' && !relative.startsWith('..\\') &&
             !path.win32.isAbsolute(relative));
    };
    if (isWithin(backup, installRoot) || isWithin(backup, workingDir)) {
        throw Error('Node agent backup cannot reside in runtime or installed application tree');
    }
    return backup;
}

export function verifyNodeBackupProvisioning(options: {
    configFile: string; entryFile: string; workingDir: string; serviceSid: string;
}): void {
    if (process.platform !== 'win32' || !serviceSidPattern.test(options.serviceSid)) {
        throw Error('Node backup preflight requires verified Windows service identity');
    }
    let backup: string;
    try {
        const config = readEnvFile(options.configFile);
        backup = assertNodeBackupLocation(
            config.NODE_ENV, config.TENANT_AGENT_BACKUP_DIR,
            options.entryFile, options.workingDir
        );
        if (!fs.statSync(backup).isDirectory()) throw Error('Invalid backup directory');
    } catch {
        throw Error('Node agent backup directory was not securely provisioned');
    }
    // Read-only ACL check includes symlink/reparse traversal. The directory
    // must grant write to the validated SERVICE SID, not shared LocalService.
    const evidence = inspectWindowsAclBatch([backup]);
    try {
        assertAclSnapshot(evidence[0], 'service-runtime', options.serviceSid);
    } catch {
        throw Error('Node agent backup ACL security preflight refused');
    }
}
