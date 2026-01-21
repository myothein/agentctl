import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import readline from 'readline';
import logger from '../../utils/logger';
import { ensureAdmin } from '../../utils/admin';
import { removeDir, fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';
import { runCommand } from '../../utils/exec';

// SHA-256 hash of uninstall password
const PASSWORD_HASH =
    '556062553bf8fd1b3a295bbc956975943f33f3228b63446df12a75c0144d57db';

// Directories to remove
const BIN_DIR = path.join('C:', 'Program Files', 'TenantAgent');
const DATA_DIR = path.join('C:', 'ProgramData', 'TenantAgent');
const NSSM_PATH = path.join(BIN_DIR, 'bin', 'nssm.exe');

export const uninstall = new Command('uninstall')
    .description('Uninstall tenant-agent service and remove all files')
    .action(async () => {
        try {
            logger.info('Starting tenant-agent uninstallation');

            // 1️⃣ Ensure admin
            ensureAdmin();
            logger.info('Admin privileges confirmed');

            // 2️⃣ Prompt password
            const password = await promptHidden('Enter uninstall password: ');
            if (!verifyPassword(password)) {
                console.error('❌ Invalid password. Uninstall aborted.');
                logger.warn('Invalid uninstall password entered');
                return;
            }
            console.log('✅ Password verified');
            logger.info('Uninstall password verified');

            // 3️⃣ Stop and remove service if NSSM exists
            if (fileExists(NSSM_PATH)) {
                await stopAndRemoveService();
            } else {
                logger.warn('nssm.exe not found, skipping service stop/remove');
            }

            // 4️⃣ Remove TenantAgent in Program Files
            if (fileExists(BIN_DIR)) {
                logger.info(`Removing TenantAgent folder: ${BIN_DIR}`);
                removeDir(BIN_DIR);
                logger.info('TenantAgent Program Files folder removed successfully');
            } else {
                logger.warn('TenantAgent Program Files folder not found, skipping removal');
            }

            // 5️⃣ Remove TenantAgent in ProgramData
            if (fileExists(DATA_DIR)) {
                logger.info(`Removing TenantAgent folder: ${DATA_DIR}`);
                removeDir(DATA_DIR);
                logger.info('TenantAgent ProgramData folder removed successfully');
            } else {
                logger.warn('TenantAgent ProgramData folder not found, skipping removal');
            }

            console.log('✅ Tenant-agent uninstalled successfully');
            logger.info('Tenant-agent uninstallation completed');

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : JSON.stringify(err);
            console.error('❌ Uninstall failed:', message);
            logger.error(message);
        }
    });

// -----------------------------
// Helper: Stop & remove service
// -----------------------------
async function stopAndRemoveService() {
    try {
        logger.info(`Stopping service "${SERVICE_NAME}"...`);
        const stopResult = await runCommand(NSSM_PATH, ['stop', SERVICE_NAME]);
        logger.info(`Service stop stdout: ${stopResult.stdout}`);
        logger.info(`Service stop stderr: ${stopResult.stderr}`);
    } catch (err) {
        logger.warn(`Failed to stop service: ${(err as Error).message}`);
    }

    try {
        logger.info(`Removing service "${SERVICE_NAME}"...`);
        const removeResult = await runCommand(NSSM_PATH, ['remove', SERVICE_NAME, 'confirm']);
        logger.info(`Service remove stdout: ${removeResult.stdout}`);
        logger.info(`Service remove stderr: ${removeResult.stderr}`);
    } catch (err) {
        logger.warn(`Failed to remove service: ${(err as Error).message}`);
    }
}

// -----------------------------
// Prompt hidden input (password)
// -----------------------------
function promptHidden(query: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const stdin = process.stdin;
        stdin.setRawMode?.(true);

        let password = '';
        process.stdout.write(query);

        const onData = (char: Buffer) => {
            const s = char.toString('utf8');

            if (s === '\r' || s === '\n') {
                stdin.off('data', onData);
                stdin.setRawMode?.(false);
                console.log();
                rl.close();
                resolve(password);
            } else if (s === '\u0003') { // Ctrl+C
                process.exit();
            } else if (s === '\u0008' || s === '\u007F') { // Backspace
                password = password.slice(0, -1);
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(query + '*'.repeat(password.length));
            } else {
                password += s;
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(query + '*'.repeat(password.length));
            }
        };

        stdin.on('data', onData);
    });
}

// -----------------------------
// Verify SHA-256 password
// -----------------------------
function verifyPassword(password: string): boolean {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    return hash === PASSWORD_HASH;
}
