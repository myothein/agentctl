import { Command } from 'commander';

/**
 * Disabled by default: old path stopped a running service and called applyUpdate()
 * with no update file, then could not restore the original binary.
 */
export const update=new Command('update')
    .description('Blocked until signed updates, backup, rollback and Windows SCM tests pass')
    .action(async()=>{
        console.error('Unsafe agent update disabled: verified signed package and rollback procedure are required.');
        process.exitCode=1;
    });
