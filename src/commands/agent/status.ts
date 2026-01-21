import { Command } from 'commander';
import path from 'path';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';
import logger from '../../utils/logger';

export const status = new Command('status')
    .description('Show tenant-agent service status')
    .action(async () => {
        try {
            // -----------------------------
            // 1️⃣ Determine EXE-safe NSSM path
            // -----------------------------
            const BASE_DIR = path.join('C:', 'Program Files', 'TenantAgent');
            const BIN_DIR = path.join(BASE_DIR, 'bin');
            const NSSM_PATH = path.join(BIN_DIR, 'nssm.exe');

            if (!fileExists(NSSM_PATH)) {
                throw new Error(
                    `nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`
                );
            }

            // -----------------------------
            // 2️⃣ Check service status
            // -----------------------------
            logger.info(`Checking status of service "${SERVICE_NAME}"...`);
            const result = await runCommand(NSSM_PATH, ['status', SERVICE_NAME]);

            logger.info(`NSSM stdout: ${result.stdout}`);
            logger.info(`NSSM stderr: ${result.stderr}`);

            const output = result.stdout || result.stderr || 'Service status unknown';
            console.log(`ℹ️ Status for "${SERVICE_NAME}":\n${output}`);

        } catch (err: unknown) {
            console.error('❌ Status check failed:', err instanceof Error ? err.message : err);
            if (err instanceof Error) logger.error(err.stack || err.message);
        }
    });
