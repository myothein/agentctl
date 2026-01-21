import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export async function prepareUpdate(version: string): Promise<string> {
    const tempDir = path.join(os.tmpdir(), `agentctl-update-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Backup current binary
    const exePath = process.execPath;
    const backupPath = exePath + '.bak';
    await fs.copyFile(exePath, backupPath);

    return tempDir;
}
