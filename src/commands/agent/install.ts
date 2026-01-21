import { Command } from 'commander';
import path from 'path';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists, writeFile } from '../../utils/fs';
import { SERVICE_NAME } from '../../constants/service';
import logger from '../../utils/logger';

const BASE_DIR = path.join('C:', 'Program Files', 'TenantAgent');
const BASE_DATA_DIR = path.join('C:', 'ProgramData', 'TenantAgent');
const BIN_DIR = path.join(BASE_DIR, 'bin');
const CONFIG_DIR = path.join(BASE_DATA_DIR, 'config');

const AGENT_EXE = path.join(BIN_DIR, 'tenant-agent.exe');
const AGENTCTL_EXE = path.join(BIN_DIR, 'agentctl.exe');
const NSSM_EXE = path.join(BIN_DIR, 'nssm.exe');
const CONFIG_FILE = path.join(CONFIG_DIR, 'agent.env');

async function execNssm(args: string[], failOnError = true) {
    if (!fileExists(NSSM_EXE)) {
        throw new Error(`nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`);
    }

    const result = await runCommand(NSSM_EXE, args);
    logger.info(`NSSM ${args.join(' ')} stdout: ${result.stdout}`);
    logger.info(`NSSM ${args.join(' ')} stderr: ${result.stderr}`);

    if (failOnError && result.code !== 0) {
        throw new Error(result.stderr || result.stdout || 'Unknown NSSM error');
    }
}

export const install = new Command('install')
    .description('Register tenant-agent Windows service')
    .action(async () => {
        try {
            logger.info('Starting tenant-agent service installation');

            // -----------------------------
            // 1️⃣ Ensure admin
            // -----------------------------
            ensureAdmin();
            logger.info('Admin privileges confirmed');

            // -----------------------------
            // 2️⃣ Validate required files
            // -----------------------------
            const REQUIRED_FILES = [AGENT_EXE, AGENTCTL_EXE, NSSM_EXE];
            for (const file of REQUIRED_FILES) {
                if (!fileExists(file)) {
                    logger.error(`Required file missing: ${file}`);
                    throw new Error(`Required file missing: ${file}`);
                }
            }
            logger.info('All required binaries are present');

            // -----------------------------
            // 3️⃣ Write default config (if missing)
            // -----------------------------
            if (!fileExists(CONFIG_FILE)) {
                const DEFAULT_CONFIG = [
                    'TENANT_ID=default',
                    'AGENT_PORT=4000',
                    'LOG_LEVEL=info',
                    `LOG_PATH=${path.join(BASE_DATA_DIR, 'logs')}`,
                    `TENANT_AGENT_BIN_PATH=${AGENT_EXE}`,
                    'AUTO_UPDATE=true',
                    'UPDATE_URL=https://updates.example.com/tenant-agent',
                ].join('\n');

                writeFile(CONFIG_FILE, DEFAULT_CONFIG);
                logger.info(`Created default config file: ${CONFIG_FILE}`);
            } else {
                logger.info('Config file exists – skipping creation');
            }

            // -----------------------------
            // 4️⃣ Stop & remove existing service (idempotent)
            // -----------------------------
            await execNssm(['stop', SERVICE_NAME], false).catch(err => logger.warn(`Stop skipped: ${err}`));
            await execNssm(['remove', SERVICE_NAME, 'confirm'], false).catch(err => logger.warn(`Remove skipped: ${err}`));

            // -----------------------------
            // 5️⃣ Install service
            // -----------------------------
            await execNssm(['install', SERVICE_NAME, AGENT_EXE]);
            await execNssm(['set', SERVICE_NAME, 'AppDirectory', BIN_DIR]);
            await execNssm(['set', SERVICE_NAME, 'Start', 'SERVICE_AUTO_START']);

            logger.info(`Service "${SERVICE_NAME}" installed successfully`);

            // -----------------------------
            // 6️⃣ Output info
            // -----------------------------
            console.log('✅ Tenant Agent service installed');
            console.log(`Service   : ${SERVICE_NAME}`);
            console.log(`Binary    : ${AGENT_EXE}`);
            console.log(`Config    : ${CONFIG_FILE}`);
            console.log(`Logs dir  : ${path.join(BASE_DIR, 'logs')}`);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('❌ Install failed:', message);
            logger.error(message);
            process.exit(1);
        }
    });
