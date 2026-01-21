import fs from 'fs';
import path from 'path';
import { runCommand } from '../utils/exec';
import { SERVICE_NAME } from '../constants/service';
import { ensureAdmin } from '../utils/admin';
import { BIN_DIR } from '../constants/paths';

export async function applyUpdate(updateFilePath?: string): Promise<void> {
    ensureAdmin();

    if (!updateFilePath) {
        throw new Error('Update file path not provided');
    }

    const DEST_BINARY = path.join(BIN_DIR, 'tenant-agent.exe');
    const NSSM_PATH = path.join(BIN_DIR, 'nssm.exe');

    if (!fs.existsSync(updateFilePath)) {
        throw new Error(`Update file not found: ${updateFilePath}`);
    }

    // Stop service
    await runCommand(NSSM_PATH, ['stop', SERVICE_NAME]);

    // Replace binary
    fs.copyFileSync(updateFilePath, DEST_BINARY);

    // Start service
    await runCommand(NSSM_PATH, ['start', SERVICE_NAME]);
}
