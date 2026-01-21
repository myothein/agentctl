import { Command } from 'commander';
import path from 'path';
import logger from '../../utils/logger';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';

const BASE_DIR = path.join('C:', 'Program Files', 'TenantAgent');
const BIN_DIR = path.join(BASE_DIR, 'bin');
const NSSM_PATH = path.join(BIN_DIR, 'nssm.exe');

// -----------------------------
// Helper: Execute NSSM safely
// -----------------------------
async function execNssm(args: string[], failOnError = true): Promise<void> {
    if (!fileExists(NSSM_PATH)) {
        throw new Error(`nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`);
    }

    const result = await runCommand(NSSM_PATH, args);
    logger.info(`NSSM ${args.join(' ')} stdout: ${result.stdout}`);
    logger.info(`NSSM ${args.join(' ')} stderr: ${result.stderr}`);

    if (failOnError && result.code !== 0) {
        // If stopping a non-existent service, log a warning instead of throwing
        if (args[0] === 'stop' && /not\s+installed/i.test(result.stderr)) {
            logger.warn(`Service "${SERVICE_NAME}" not found during stop`);
        } else {
            throw new Error(result.stderr || result.stdout || 'Unknown NSSM error');
        }
    }
}

// -----------------------------
// Lifecycle Command
// -----------------------------
export const lifecycle = new Command('lifecycle')
    .description('Manage tenant-agent service');

// -----------------------------
// Start Service
// -----------------------------
lifecycle
    .command('start')
    .description('Start tenant-agent service')
    .action(async () => {
        try {
            ensureAdmin();
            logger.info('Starting tenant-agent service...');
            await execNssm(['start', SERVICE_NAME]);
            console.log(`✅ Service "${SERVICE_NAME}" started successfully`);
        } catch (err: unknown) {
            console.error('❌ Start failed:', err instanceof Error ? err.message : err);
            if (err instanceof Error) logger.error(err.stack || err.message);
        }
    });

// -----------------------------
// Stop Service
// -----------------------------
lifecycle
    .command('stop')
    .description('Stop tenant-agent service')
    .action(async () => {
        try {
            ensureAdmin();
            logger.info('Stopping tenant-agent service...');
            await execNssm(['stop', SERVICE_NAME], false); // stop gracefully
            console.log(`✅ Service "${SERVICE_NAME}" stopped successfully`);
        } catch (err: unknown) {
            console.error('❌ Stop failed:', err instanceof Error ? err.message : err);
            if (err instanceof Error) logger.error(err.stack || err.message);
        }
    });

// -----------------------------
// Restart Service
// -----------------------------
lifecycle
    .command('restart')
    .description('Restart tenant-agent service')
    .action(async () => {
        try {
            ensureAdmin();
            logger.info('Restarting tenant-agent service...');
            await execNssm(['stop', SERVICE_NAME], false);
            await execNssm(['start', SERVICE_NAME]);
            console.log(`✅ Service "${SERVICE_NAME}" restarted successfully`);
        } catch (err: unknown) {
            console.error('❌ Restart failed:', err instanceof Error ? err.message : err);
            if (err instanceof Error) logger.error(err.stack || err.message);
        }
    });

// -----------------------------
// Status
// -----------------------------
lifecycle
    .command('status')
    .description('Show tenant-agent service status')
    .action(async () => {
        try {
            if (!fileExists(NSSM_PATH)) {
                throw new Error(`nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`);
            }

            const result = await runCommand(NSSM_PATH, ['status', SERVICE_NAME]);
            console.log(result.stdout || result.stderr);
            logger.info(`Service status checked: ${result.stdout || result.stderr}`);
        } catch (err: unknown) {
            console.error('❌ Status check failed:', err instanceof Error ? err.message : err);
            if (err instanceof Error) logger.error(err.stack || err.message);
        }
    });
