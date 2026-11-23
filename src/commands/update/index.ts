import { Command } from 'commander';
import { checkVersionAndUpdate } from '../../core/self-update/index';

/** This legacy subcommand only supports a safe metadata/version check. */
export const agentctlUpdate = new Command('update')
    .description('Check for a new agentctl version; live replacement is disabled')
    .option('--check','Inspect version metadata without changing files')
    .option('--yes','Legacy option; automatic update is disabled')
    .action(async(options:{check?:boolean;yes?:boolean})=>{
        try {
            if(!options.check || options.yes) {
                throw new Error('Unsafe self-update disabled');
            }
            const result=await checkVersionAndUpdate({check:true,yes:false});
            console.log('Latest published version: '+result.version);
            console.log('No service or executable changes made');
        }catch(error){
            console.error(error instanceof Error?error.message:'Update check failed');
            process.exitCode=1;
        }
    });
