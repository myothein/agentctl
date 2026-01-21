import { Command } from 'commander';
import path from 'path';
import logger from '../../utils/logger';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';

export const restart = new Command('restart')
    .description('Restart tenant-agent Windows service')
    .action(async () => {
        try {
            // -------------------------------------------------
            // 1️⃣ Admin privileges required
            // -------------------------------------------------
            ensureAdmin();
            logger.info(`Restarting service "${SERVICE_NAME}"`);

            // -------------------------------------------------
            // 2️⃣ Fixed MSI-owned paths
            // -------------------------------------------------
            const BASE_DIR = path.join('C:', 'Program Files', 'TenantAgent');
            const BIN_DIR = path.join(BASE_DIR, 'bin');
            const NSSM_EXE = path.join(BIN_DIR, 'nssm.exe');

            if (!fileExists(NSSM_EXE)) {
                throw new Error(
                    `nssm.exe not found at ${NSSM_EXE}. The installation may be corrupted.`
                );
            }

            // -------------------------------------------------
            // 3️⃣ Check current service status
            // -------------------------------------------------
            const status = await runCommand(NSSM_EXE, ['status', SERVICE_NAME]);

            if (status.code !== 0) {
                throw new Error(`Service "${SERVICE_NAME}" is not installed.`);
            }

            const isStopped = status.stdout?.includes('SERVICE_STOPPED');

            // -------------------------------------------------
            // 4️⃣ Stop service if running
            // -------------------------------------------------
            if (!isStopped) {
                logger.info('Service running → stopping');
                const stop = await runCommand(NSSM_EXE, ['stop', SERVICE_NAME]);

                if (stop.code !== 0) {
                    throw new Error(
                        stop.stderr || stop.stdout || 'Failed to stop service'
                    );
                }
            } else {
                logger.info('Service already stopped');
            }

            // -------------------------------------------------
            // 5️⃣ Start service
            // -------------------------------------------------
            logger.info('Starting service');
            const start = await runCommand(NSSM_EXE, ['start', SERVICE_NAME]);

            if (start.code !== 0) {
                throw new Error(
                    start.stderr || start.stdout || 'Failed to start service'
                );
            }

            console.log(`✅ Service "${SERVICE_NAME}" restarted successfully`);
            logger.info('Service restarted successfully');

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`❌ Restart failed: ${message}`);
            logger.error(message);
            process.exit(1);
        }
    });
