import { Command } from 'commander';
import path from 'node:path';
import logger from '../../utils/logger';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';
import { transitionVerifiedService, verifyNodeServiceBeforeStart } from
    '../../core/agent/secure-service-lifecycle';

const NSSM_EXE=path.win32.join('C:\\','Program Files','TenantAgent','bin','nssm.exe');

export const start=new Command('start')
    .description('Start the reviewed tenant-agent Windows Node service')
    .action(async()=>{
        try {
            ensureAdmin();
            if(!fileExists(NSSM_EXE)) throw new Error('Missing NSSM executable');
            // Check the registered service identity, executable, config and
            // protected SQLite backup ACLs before any SCM state mutation.
            const outcome=await transitionVerifiedService(
                'start', verifyNodeServiceBeforeStart,
                args=>runCommand(NSSM_EXE,args,{silent:true}),SERVICE_NAME
            );
            console.log('Tenant-agent service '+outcome);
            logger.info('Verified tenant-agent service '+outcome);
        } catch {
            // Never print NSSM stderr or raw errors: output may disclose
            // installation paths, service configuration or secret material.
            console.error('Tenant-agent start refused; check secure service configuration');
            logger.error('Verified tenant-agent start refused');
            process.exitCode=1;
        }
    });
