import { Command } from 'commander';
import path from 'path';
import logger from '../../utils/logger';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';

export const start = new Command('start')
    .description('Start tenant-agent Windows service')
    .action(async () => {
        try {
            // -------------------------------------------------
            // 1️⃣ Admin privileges are required
            // -------------------------------------------------
            ensureAdmin();
            logger.info(`Starting service "${SERVICE_NAME}"`);

            // -------------------------------------------------
            // 2️⃣ Fixed MSI-owned layout
            // -------------------------------------------------
            const BASE_DIR = path.join('C:', 'Program Files', 'TenantAgent');
            const BIN_DIR = path.join(BASE_DIR, 'bin');
            const NSSM_EXE = path.join(BIN_DIR, 'nssm.exe');

            if (!fileExists(NSSM_EXE)) {
                throw new Error(
                    `nssm.exe not found at ${NSSM_EXE}. The product may be corrupted.`
                );
            }

            // -------------------------------------------------
            // 3️⃣ Check service existence
            // -------------------------------------------------
            const status = await runCommand(NSSM_EXE, ['status', SERVICE_NAME]);

            if (status.stdout?.includes('SERVICE_RUNNING')) {
                console.log(`ℹ️ Service "${SERVICE_NAME}" is already running`);
                logger.info('Service already running');
                return;
            }

            if (status.code !== 0 && status.stderr) {
                throw new Error(
                    `Service "${SERVICE_NAME}" is not installed. Run: agentctl install`
                );
            }

            // -------------------------------------------------
            // 4️⃣ Start service
            // -------------------------------------------------
            const result = await runCommand(NSSM_EXE, ['start', SERVICE_NAME]);

            if (result.code !== 0) {
                throw new Error(result.stderr || result.stdout || 'Unknown NSSM error');
            }

            console.log(`✅ Service "${SERVICE_NAME}" started successfully`);
            logger.info('Service started successfully');

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`❌ Start failed: ${message}`);
            logger.error(message);
            process.exit(1);
        }
    });
