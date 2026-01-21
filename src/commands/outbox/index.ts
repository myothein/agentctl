import { Command } from 'commander';
import { backupOutboxCmd } from './backup.js';
import { restoreOutboxCmd } from './restore.js';
import { listOutboxCmd } from './list.js';
import { pruneOutboxCmd } from './prune.js';
import { migrateOutboxCmd } from './migrate.js';
import { updateOutboxCmd } from './update.js';
/**
 * Root outbox command
 */
export const outbox = new Command('outbox')
    .description('Manage outbox database (outbox.db)')
    .addCommand(backupOutboxCmd)
    .addCommand(restoreOutboxCmd)
    .addCommand(listOutboxCmd)
    .addCommand(pruneOutboxCmd)
    .addCommand(migrateOutboxCmd)
    .addCommand(updateOutboxCmd);
