import { Command } from 'commander';
import { ensureAdmin } from '../../core/system/admin.js';
import { stopServiceIfRunning, startService } from '../../core/agent/service-manager.js';
import { backupOutbox } from '../../core/outbox/backup.js';
import { migrateOutbox } from '../../core/outbox/migrate.js';
import { OUTBOX_DB } from '../../core/outbox/paths.js';
import { getDbVersion, latestVersion } from '../../core/outbox/version.js';

export const updateOutboxCmd = new Command('update')
    .description('Safely update outbox.db to the latest schema version')
    .option('--dry-run', 'Show what would happen without making changes')
    .action(async (opts) => {
        try {
            ensureAdmin();

            console.log(`[INFO] Checking outbox database at ${OUTBOX_DB}...`);

            // Show current schema version
            const currentVersion = getDbVersion(OUTBOX_DB as any); // adjust if needed
            console.log(`Current outbox schema version: ${currentVersion}`);
            console.log(`Latest schema version: ${latestVersion}`);

            if (currentVersion >= latestVersion) {
                console.log('✅ Outbox database is already up to date');
                return;
            }

            console.log('🔄 Updating outbox database...');

            // Backup first
            if (!opts.dryRun) {
                const backupPath = backupOutbox();
                console.log(`📦 Backup created: ${backupPath}`);
            } else {
                console.log('📝 Dry run – backup skipped');
            }

            // Run migrations
            await migrateOutbox({ dryRun: !!opts.dryRun });

            console.log('✅ Outbox database update completed successfully');
        } catch (err) {
            console.error('❌ CLI Error:', err);
        }
    });
