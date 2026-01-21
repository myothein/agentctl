"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.install = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const admin_1 = require("../../utils/admin");
const exec_1 = require("../../utils/exec");
const fs_1 = require("../../utils/fs");
const service_1 = require("../../constants/service");
const logger_1 = __importDefault(require("../../utils/logger"));
const BASE_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
const BASE_DATA_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent');
const BIN_DIR = path_1.default.join(BASE_DIR, 'bin');
const CONFIG_DIR = path_1.default.join(BASE_DATA_DIR, 'config');
const AGENT_EXE = path_1.default.join(BIN_DIR, 'tenant-agent.exe');
const AGENTCTL_EXE = path_1.default.join(BIN_DIR, 'agentctl.exe');
const NSSM_EXE = path_1.default.join(BIN_DIR, 'nssm.exe');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'agent.env');
async function execNssm(args, failOnError = true) {
    if (!(0, fs_1.fileExists)(NSSM_EXE)) {
        throw new Error(`nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`);
    }
    const result = await (0, exec_1.runCommand)(NSSM_EXE, args);
    logger_1.default.info(`NSSM ${args.join(' ')} stdout: ${result.stdout}`);
    logger_1.default.info(`NSSM ${args.join(' ')} stderr: ${result.stderr}`);
    if (failOnError && result.code !== 0) {
        throw new Error(result.stderr || result.stdout || 'Unknown NSSM error');
    }
}
exports.install = new commander_1.Command('install')
    .description('Register tenant-agent Windows service')
    .action(async () => {
    try {
        logger_1.default.info('Starting tenant-agent service installation');
        // -----------------------------
        // 1️⃣ Ensure admin
        // -----------------------------
        (0, admin_1.ensureAdmin)();
        logger_1.default.info('Admin privileges confirmed');
        // -----------------------------
        // 2️⃣ Validate required files
        // -----------------------------
        const REQUIRED_FILES = [AGENT_EXE, AGENTCTL_EXE, NSSM_EXE];
        for (const file of REQUIRED_FILES) {
            if (!(0, fs_1.fileExists)(file)) {
                logger_1.default.error(`Required file missing: ${file}`);
                throw new Error(`Required file missing: ${file}`);
            }
        }
        logger_1.default.info('All required binaries are present');
        // -----------------------------
        // 3️⃣ Write default config (if missing)
        // -----------------------------
        if (!(0, fs_1.fileExists)(CONFIG_FILE)) {
            const DEFAULT_CONFIG = [
                'TENANT_ID=default',
                'AGENT_PORT=4000',
                'LOG_LEVEL=info',
                `LOG_PATH=${path_1.default.join(BASE_DATA_DIR, 'logs')}`,
                `TENANT_AGENT_BIN_PATH=${AGENT_EXE}`,
                'AUTO_UPDATE=true',
                'UPDATE_URL=https://updates.example.com/tenant-agent',
            ].join('\n');
            (0, fs_1.writeFile)(CONFIG_FILE, DEFAULT_CONFIG);
            logger_1.default.info(`Created default config file: ${CONFIG_FILE}`);
        }
        else {
            logger_1.default.info('Config file exists – skipping creation');
        }
        // -----------------------------
        // 4️⃣ Stop & remove existing service (idempotent)
        // -----------------------------
        await execNssm(['stop', service_1.SERVICE_NAME], false).catch(err => logger_1.default.warn(`Stop skipped: ${err}`));
        await execNssm(['remove', service_1.SERVICE_NAME, 'confirm'], false).catch(err => logger_1.default.warn(`Remove skipped: ${err}`));
        // -----------------------------
        // 5️⃣ Install service
        // -----------------------------
        await execNssm(['install', service_1.SERVICE_NAME, AGENT_EXE]);
        await execNssm(['set', service_1.SERVICE_NAME, 'AppDirectory', BIN_DIR]);
        await execNssm(['set', service_1.SERVICE_NAME, 'Start', 'SERVICE_AUTO_START']);
        logger_1.default.info(`Service "${service_1.SERVICE_NAME}" installed successfully`);
        // -----------------------------
        // 6️⃣ Output info
        // -----------------------------
        console.log('✅ Tenant Agent service installed');
        console.log(`Service   : ${service_1.SERVICE_NAME}`);
        console.log(`Binary    : ${AGENT_EXE}`);
        console.log(`Config    : ${CONFIG_FILE}`);
        console.log(`Logs dir  : ${path_1.default.join(BASE_DIR, 'logs')}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('❌ Install failed:', message);
        logger_1.default.error(message);
        process.exit(1);
    }
});
//# sourceMappingURL=install.js.map