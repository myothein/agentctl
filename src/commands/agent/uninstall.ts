import { Command } from 'commander';

/**
 * The previous uninstall removed all ProgramData and tenant SQLite backups.
 * This path is deliberately disabled until a tested data-preserving uninstall,
 * independent backup/restore evidence and explicit operator approval exist.
 * No static password hash provides meaningful authorization.
 */
export const uninstall=new Command('uninstall')
    .description('Blocked until data-preserving uninstall and restore procedure passes Windows QA')
    .action(async()=>{
        console.error('Unsafe uninstall blocked: tenant data and backups must be preserved and verified.');
        process.exitCode=1;
    });
