import { Command } from 'commander';
import { restoreOutbox, listBackups } from '../../core/outbox/restore.js';
import { ensureAdmin } from '../../core/system/admin.js';
import { promptConfirm } from '../../core/utils/prompt.js';

export const restoreOutboxCmd = new Command('restore')
    .description('Restore outbox.db from backup')
    .argument('<backupFile>', 'Backup filename to restore')
    .action(async (backupFile: string) => {
        ensureAdmin();

        const backups = await listBackups();
        if (!backups.includes(backupFile)) {
            console.error(`❌ Backup "${backupFile}" not found`);
            process.exit(1);
        }

        const confirm = await promptConfirm(
            `⚠ This will overwrite the current outbox.db. Type RESTORE to continue`
        );
        if (!confirm) {
            console.log('Aborted by user');
            process.exit(0);
        }

        try {
            await restoreOutbox(backupFile);
            console.log(`✅ Outbox restored from: ${backupFile}`);
        } catch (err: any) {
            console.error('❌ Restore failed:', err.message || err);
            process.exit(1);
        }
    });
