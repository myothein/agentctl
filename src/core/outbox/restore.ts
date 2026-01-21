import fs from 'fs';
import path from 'path';
import { ensureAdmin } from '../system/admin.js';
import { stopService, startService } from '../agent/service-manager.js';
import { OUTBOX_DB, OUTBOX_BACKUP_DIR } from './paths.js';

/**
 * List all existing outbox backups
 */
export function listBackups(): string[] {
    if (!fs.existsSync(OUTBOX_BACKUP_DIR)) return [];
    return fs.readdirSync(OUTBOX_BACKUP_DIR).filter(f => f.endsWith('.db'));
}

/**
 * Restore outbox.db from a backup file
 * Stops tenant-agent service before restore and starts it after
 */
export function restoreOutbox(backupFile: string): void {
    ensureAdmin();

    stopService();

    try {
        const src = path.join(OUTBOX_BACKUP_DIR, backupFile);
        if (!fs.existsSync(src)) throw new Error(`Backup not found: ${backupFile}`);

        // Copy main DB file
        fs.copyFileSync(src, OUTBOX_DB);

        // Copy WAL and SHM files if they exist
        for (const ext of ['-wal', '-shm']) {
            if (fs.existsSync(src + ext)) fs.copyFileSync(src + ext, OUTBOX_DB + ext);
        }

        console.log(`✅ Restored outbox.db from backup: ${backupFile}`);
    } finally {
        startService();
    }
}
