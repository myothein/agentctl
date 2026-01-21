import { Command } from 'commander';
import { listBackups } from '../../core/outbox/list.js';

export const listOutboxCmd = new Command('list')
    .description('List available outbox backups')
    .action(async () => {
        try {
            const backups = await listBackups();
            if (!backups.length) {
                console.log('No backups found');
            } else {
                backups.forEach((b) => console.log(`- ${b}`));
            }
        } catch (err: any) {
            console.error('❌ Failed to list backups:', err.message || err);
            process.exit(1);
        }
    });
