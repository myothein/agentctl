import { Command } from 'commander';
import path from 'node:path';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';
import { installNewService } from '../../core/agent/safe-install';

const programFiles=path.win32.join('C:\\','Program Files','TenantAgent');
const programData=path.win32.join('C:\\','ProgramData','TenantAgent');
const binDir=path.win32.join(programFiles,'bin');

export const install=new Command('install')
    .description('Register a NEW demand-start Windows agent service (never replace existing)')
    .action(async()=>{
        try{
            ensureAdmin();
            await installNewService({
                serviceName:SERVICE_NAME,
                agentExe:path.win32.join(binDir,'tenant-agent.exe'),
                ctlExe:path.win32.join(binDir,'agentctl.exe'),
                nssmExe:path.win32.join(binDir,'nssm.exe'),
                binDir,
                configFile:path.win32.join(programData,'config','agent.env'),
                fileExists,
                run:async args=>runCommand(path.win32.join(binDir,'nssm.exe'),args,{silent:true})
            });
            console.log('New tenant-agent Windows service registered in MANUAL START mode.');
            console.log('Runtime secret provisioning, ACL review and SCM acceptance remain mandatory.');
        }catch(error){
            console.error('Install refused:',error instanceof Error?error.message:'Unknown error');
            process.exitCode=1;
        }
    });
