import fs from 'fs';
import path from 'path';
import { OUTBOX_BACKUP_DIR } from './paths.js';

/**
 * List all outbox.db backups
 * @returns Array of backup filenames, newest first
 */
export async function listBackups(): Promise<string[]> {
    if (!fs.existsSync(OUTBOX_BACKUP_DIR)) return [];

    // Get all .db files
    const files = fs
        .readdirSync(OUTBOX_BACKUP_DIR)
        .filter((f) => f.endsWith('.db'))
        .map((file) => {
            const fullPath = path.join(OUTBOX_BACKUP_DIR, file);
            const stats = fs.statSync(fullPath);
            return { file, mtime: stats.mtimeMs };
        })
        // Sort newest first
        .sort((a, b) => b.mtime - a.mtime)
        .map((f) => f.file);

    return files;
}
