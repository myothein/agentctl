import { Command } from 'commander';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';
import { installNewService } from '../../core/agent/safe-install';
import { verifyNodeServiceSecurity, verifyNodeBackupProvisioning, resolveWindowsServiceSid } from '../../core/agent/windows-security-preflight';

const programFiles=path.win32.join('C:\\','Program Files','TenantAgent');
const programData=path.win32.join('C:\\','ProgramData','TenantAgent');
const binDir=path.win32.join(programFiles,'bin');

export const install=new Command('install')
    .description('Register a NEW demand-start Windows agent service (never replace existing)')
    .option('--node-runtime','Opt-in Node 22 service mode for the staged JavaScript tenant-agent')
    .action(async(options:{nodeRuntime?:boolean})=>{
        try{
            ensureAdmin();
            // Node service mode runs the signed/deployment-reviewed Node runtime,
            // not a fabricated tenant-agent.exe. No secret is passed as a flag.
            const nodeExe=path.win32.join('C:\\','Program Files','nodejs','node.exe');
            let runtimeVersion='';
            let serviceSid='';
            if(options.nodeRuntime){
                serviceSid=resolveWindowsServiceSid(SERVICE_NAME);
                const output=execFileSync(nodeExe,['--version'],{
                    encoding:'utf8',windowsHide:true,timeout:5000
                }).trim();
                if(!/^v22\.\d+\.\d+$/.test(output)){
                    throw new Error('A verified Node.js v22 runtime is required');
                }
                runtimeVersion=output;
            }
            await installNewService({
                serviceName:SERVICE_NAME,
                agentExe:options.nodeRuntime?nodeExe:path.win32.join(binDir,'tenant-agent.exe'),
                ctlExe:options.nodeRuntime?nodeExe:path.win32.join(binDir,'agentctl.exe'),
                nssmExe:path.win32.join(binDir,'nssm.exe'),
                binDir,
                configFile:path.win32.join(programData,'config','agent.env'),
                ...(options.nodeRuntime?{nodeAgent:{
                    entryFile:path.win32.join(programFiles,'app','dist','index.js'),
                    workingDir:path.win32.join(programData,'runtime'),
                    runtimeVersion,
                    serviceAccount:'NT AUTHORITY\\LocalService' as const,
                    serviceSid
                }}:{}),
                fileExists,
                ...(options.nodeRuntime?{verifyNodeSecurity:({agentExe,nodeAgent,configFile,nssmExe})=>{
                    if(!nodeAgent)throw new Error('Missing Node service configuration');
                    verifyNodeServiceSecurity({
                        nodeExe:agentExe,entryFile:nodeAgent.entryFile,
                        configFile,workingDir:nodeAgent.workingDir,nssmExe,
                        serviceAccount:nodeAgent.serviceAccount,serviceSid:nodeAgent.serviceSid
                    });
                    // The tenant-agent must never start in development mode
                    // or fall back to an application-tree SQLite backup path.
                    verifyNodeBackupProvisioning({
                        configFile,entryFile:nodeAgent.entryFile,
                        workingDir:nodeAgent.workingDir,serviceSid:nodeAgent.serviceSid
                    });
                }}:{}),
                ...(options.nodeRuntime?{configureServiceSid:async(name:string)=>{
                    // Force per-service SID into the LocalService process token;
                    // never accept a missing SID or silently use the shared
                    // LocalService identity for private database ACLs.
                    execFileSync('sc.exe',['sidtype',name,'unrestricted'],{
                        windowsHide:true,timeout:5000,stdio:['ignore','pipe','pipe']
                    });
                    const verified=execFileSync('sc.exe',['qsidtype',name],{
                        encoding:'utf8',windowsHide:true,timeout:5000,
                        stdio:['ignore','pipe','pipe']
                    });
                    if(!/SERVICE_SID_TYPE:\s*UNRESTRICTED/i.test(verified)){
                        throw new Error('Windows service SID activation could not be verified');
                    }
                }}:{}),
                run:async args=>runCommand(path.win32.join(binDir,'nssm.exe'),args,{silent:true})
            });
            console.log('New tenant-agent Windows service registered in MANUAL START mode.');
            console.log('Runtime secret provisioning, ACL review and SCM acceptance remain mandatory.');
        }catch(error){
            console.error('Install refused:',error instanceof Error?error.message:'Unknown error');
            process.exitCode=1;
        }
    });
