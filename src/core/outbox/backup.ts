import fs from 'fs';
import path from 'path';
import { ensureAdmin } from '../system/admin.js';
import { OUTBOX_DB, OUTBOX_BACKUP_DIR } from './paths.js';
import { stopServiceIfRunning, startService } from '../agent/service-manager.js';

/**
 * Create a timestamped backup of outbox.db
 * Stops tenant-agent service during backup
 */
export function backupOutbox(): string {
    ensureAdmin();

    stopServiceIfRunning();

    try {
        // Ensure backup directory exists
        fs.mkdirSync(OUTBOX_BACKUP_DIR, { recursive: true });

        // Generate timestamped backup file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const target = path.join(OUTBOX_BACKUP_DIR, `outbox-${timestamp}.db`);

        // Copy main database file
        fs.copyFileSync(OUTBOX_DB, target);

        // Copy WAL/SHM files if they exist
        for (const ext of ['-wal', '-shm']) {
            const file = OUTBOX_DB + ext;
            if (fs.existsSync(file)) fs.copyFileSync(file, target + ext);
        }

        console.log(`📦 Backup created: ${target}`);
        return target;
    } finally {
        // Always restart service
        startService();
    }
}
