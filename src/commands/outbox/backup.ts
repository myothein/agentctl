import { Command } from 'commander';
import { backupOutbox } from '../../core/outbox/backup.js';
import { ensureAdmin } from '../../core/system/admin.js';

export const backupOutboxCmd = new Command('backup')
    .description('Backup outbox.db safely')
    .action(async () => {
        ensureAdmin();
        try {
            const file = await backupOutbox();
            console.log(`✅ Outbox backed up to: ${file}`);
        } catch (err: any) {
            console.error('❌ Backup failed:', err.message || err);
            process.exit(1);
        }
    });
