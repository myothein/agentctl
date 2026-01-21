import fs from 'fs';
import path from 'path';
import { OUTBOX_BACKUP_DIR } from './paths.js';

export async function pruneBackups(keep: number): Promise<number> {
    if (!fs.existsSync(OUTBOX_BACKUP_DIR)) return 0;

    const files = fs
        .readdirSync(OUTBOX_BACKUP_DIR)
        .filter(f => f.endsWith('.db'))
        .map(f => ({ file: f, time: fs.statSync(path.join(OUTBOX_BACKUP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

    const toDelete = files.slice(keep);
    toDelete.forEach(f => fs.unlinkSync(path.join(OUTBOX_BACKUP_DIR, f.file)));
    return toDelete.length;
}
