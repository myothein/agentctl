import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AGENTCTL_EXE, AGENTCTL_BACKUP } from './paths';
import { waitForUnlock } from './file-lock';

/**
 * PowerShell command wrapper to replace running agentctl.exe
 * @param newBinaryPath path to the downloaded agentctl.exe
 */
export async function runUpdater(newBinaryPath: string) {
    // Ensure the old binary is not locked
    await waitForUnlock(AGENTCTL_EXE);

    // Backup current binary
    if (fs.existsSync(AGENTCTL_EXE)) {
        fs.copyFileSync(AGENTCTL_EXE, AGENTCTL_BACKUP);
    }

    // Replace running binary
    try {
        const psScript = `
      $src = "${newBinaryPath.replace(/\\/g, '\\\\')}"
      $dst = "${AGENTCTL_EXE.replace(/\\/g, '\\\\')}"
      Copy-Item -Force $src $dst
    `;

        execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`);
    } catch (err) {
        throw new Error(`PowerShell updater failed: ${err}`);
    }

    console.log('agentctl.exe successfully updated.');
}
