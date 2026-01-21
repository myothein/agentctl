import { Command } from 'commander';
import { pruneBackups } from '../../core/outbox/prune.js';
import { ensureAdmin } from '../../core/system/admin.js';

export const pruneOutboxCmd = new Command('prune')
    .description('Remove old outbox backups, keeping the latest N (default 5)')
    .option('-k, --keep <number>', 'Number of backups to keep', '5')
    .action(async (options) => {
        ensureAdmin();
        const keep = parseInt(options.keep, 10);
        if (isNaN(keep) || keep <= 0) {
            console.error('❌ --keep must be a positive number');
            process.exit(1);
        }

        try {
            const removed = await pruneBackups(keep);
            console.log(`✅ Pruned ${removed} old backups, keeping ${keep} latest`);
        } catch (err: any) {
            console.error('❌ Prune failed:', err.message || err);
            process.exit(1);
        }
    });
