import { Command } from 'commander';
import { migrateOutbox } from '../../core/outbox/migrate.js';

export const migrateOutboxCmd = new Command('migrate')
    .description('Migrate outbox.db schema to latest version')
    .option('--dry-run', 'Show what migrations would run')
    .action(async (opts) => {
        await migrateOutbox({ dryRun: !!opts.dryRun });
    });
