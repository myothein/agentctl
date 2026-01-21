import fs from 'fs/promises';
import path from 'path';

export async function rollback(): Promise<void> {
    const exePath = process.execPath;
    const backupPath = exePath + '.bak';

    try {
        await fs.access(backupPath);
        await fs.copyFile(backupPath, exePath);
        await fs.unlink(backupPath);
        console.log('Rollback completed: restored previous agentctl binary.');
    } catch {
        console.error('Rollback failed: backup not found.');
    }
}
