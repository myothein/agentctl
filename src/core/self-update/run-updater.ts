import path from 'path';
import fs from 'fs';
import { runCommand } from '../../utils/exec';
import { waitForUnlock } from '../../platform/windows/self-update/file-lock';
import { AGENTCTL_EXE, AGENTCTL_BACKUP } from '../../platform/windows/self-update/paths';

/**
 * Run PowerShell updater to replace the running agentctl.exe safely.
 * @param newBinaryPath Full path to downloaded agentctl.exe
 */
export async function runUpdater(newBinaryPath: string): Promise<void> {
    try {
        // 1️⃣ Wait for the current exe to be unlocked
        await waitForUnlock(AGENTCTL_EXE);

        // 2️⃣ Backup current binary
        if (fs.existsSync(AGENTCTL_EXE)) {
            fs.copyFileSync(AGENTCTL_EXE, AGENTCTL_BACKUP);
            console.log(`Backup created at ${AGENTCTL_BACKUP}`);
        }

        // 3️⃣ PowerShell script path
        const updaterScript = path.join(__dirname, 'updater.ps1.ts');

        // 4️⃣ Run PowerShell to replace the binary
        const result = await runCommand('powershell', [
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            updaterScript,
            newBinaryPath,
        ]);

        if (result.code !== 0) {
            throw new Error(`PowerShell updater failed: ${result.stderr}`);
        }

        console.log('✔ agentctl.exe successfully updated.');
    } catch (err: any) {
        console.error(`❌ Failed to update agentctl.exe: ${err.message}`);
        throw err; // let rollback handle restoring the backup
    }
}
