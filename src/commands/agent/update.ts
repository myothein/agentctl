import { Command } from 'commander';
import path from 'path';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { applyUpdate } from '../../update/apply';
import { SERVICE_NAME } from '../../constants/service';
import logger from '../../utils/logger';

export const update = new Command('update')
    .description('Update tenant-agent to the latest version')
    .action(async () => {
        try {
            // -------------------------------------------------
            // 1️⃣ Require admin
            // -------------------------------------------------
            ensureAdmin();
            logger.info('Admin privileges confirmed');
            console.log('🔒 Admin privileges confirmed');

            // -------------------------------------------------
            // 2️⃣ Resolve MSI-owned NSSM path
            // -------------------------------------------------
            const BASE_DIR = path.join('C:', 'Program Files', 'TenantAgent');
            const BIN_DIR = path.join(BASE_DIR, 'bin');
            const NSSM_EXE = path.join(BIN_DIR, 'nssm.exe');

            if (!fileExists(NSSM_EXE)) {
                throw new Error(
                    'nssm.exe not found. Tenant Agent may not be installed.'
                );
            }

            // -------------------------------------------------
            // 3️⃣ Verify service exists
            // -------------------------------------------------
            const status = await runCommand(NSSM_EXE, ['status', SERVICE_NAME]);
            if (status.code !== 0) {
                throw new Error(
                    `Service "${SERVICE_NAME}" not found. Update aborted.`
                );
            }

            const isStopped = status.stdout?.includes('SERVICE_STOPPED');

            // -------------------------------------------------
            // 4️⃣ Stop service if running
            // -------------------------------------------------
            if (!isStopped) {
                logger.info('Stopping service before update');
                console.log('⏹️ Stopping tenant-agent service...');

                const stop = await runCommand(NSSM_EXE, ['stop', SERVICE_NAME]);
                if (stop.code !== 0) {
                    throw new Error(
                        stop.stderr || stop.stdout || 'Failed to stop service'
                    );
                }
            }

            // -------------------------------------------------
            // 5️⃣ Apply update
            // -------------------------------------------------
            logger.info('Applying tenant-agent update');
            console.log('⬇️ Applying tenant-agent update...');

            await applyUpdate();

            // -------------------------------------------------
            // 6️⃣ Restart service
            // -------------------------------------------------
            logger.info('Starting service after update');
            console.log('▶️ Starting tenant-agent service...');

            const start = await runCommand(NSSM_EXE, ['start', SERVICE_NAME]);
            if (start.code !== 0) {
                throw new Error(
                    start.stderr || start.stdout || 'Failed to start service'
                );
            }

            // -------------------------------------------------
            // 7️⃣ Success
            // -------------------------------------------------
            console.log('✅ Tenant-agent update completed successfully');
            logger.info('Tenant-agent update completed successfully');

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`❌ Update failed: ${message}`);
            logger.error(message);
            process.exit(1);
        }
    });
