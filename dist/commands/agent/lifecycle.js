"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycle = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
const admin_1 = require("../../utils/admin");
const exec_1 = require("../../utils/exec");
const fs_1 = require("../../utils/fs");
const service_1 = require("../../constants/service");
const BASE_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
const BIN_DIR = path_1.default.join(BASE_DIR, 'bin');
const NSSM_PATH = path_1.default.join(BIN_DIR, 'nssm.exe');
// -----------------------------
// Helper: Execute NSSM safely
// -----------------------------
async function execNssm(args, failOnError = true) {
    if (!(0, fs_1.fileExists)(NSSM_PATH)) {
        throw new Error(`nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`);
    }
    const result = await (0, exec_1.runCommand)(NSSM_PATH, args);
    logger_1.default.info(`NSSM ${args.join(' ')} stdout: ${result.stdout}`);
    logger_1.default.info(`NSSM ${args.join(' ')} stderr: ${result.stderr}`);
    if (failOnError && result.code !== 0) {
        // If stopping a non-existent service, log a warning instead of throwing
        if (args[0] === 'stop' && /not\s+installed/i.test(result.stderr)) {
            logger_1.default.warn(`Service "${service_1.SERVICE_NAME}" not found during stop`);
        }
        else {
            throw new Error(result.stderr || result.stdout || 'Unknown NSSM error');
        }
    }
}
// -----------------------------
// Lifecycle Command
// -----------------------------
exports.lifecycle = new commander_1.Command('lifecycle')
    .description('Manage tenant-agent service');
// -----------------------------
// Start Service
// -----------------------------
exports.lifecycle
    .command('start')
    .description('Start tenant-agent service')
    .action(async () => {
    try {
        (0, admin_1.ensureAdmin)();
        logger_1.default.info('Starting tenant-agent service...');
        await execNssm(['start', service_1.SERVICE_NAME]);
        console.log(`✅ Service "${service_1.SERVICE_NAME}" started successfully`);
    }
    catch (err) {
        console.error('❌ Start failed:', err instanceof Error ? err.message : err);
        if (err instanceof Error)
            logger_1.default.error(err.stack || err.message);
    }
});
// -----------------------------
// Stop Service
// -----------------------------
exports.lifecycle
    .command('stop')
    .description('Stop tenant-agent service')
    .action(async () => {
    try {
        (0, admin_1.ensureAdmin)();
        logger_1.default.info('Stopping tenant-agent service...');
        await execNssm(['stop', service_1.SERVICE_NAME], false); // stop gracefully
        console.log(`✅ Service "${service_1.SERVICE_NAME}" stopped successfully`);
    }
    catch (err) {
        console.error('❌ Stop failed:', err instanceof Error ? err.message : err);
        if (err instanceof Error)
            logger_1.default.error(err.stack || err.message);
    }
});
// -----------------------------
// Restart Service
// -----------------------------
exports.lifecycle
    .command('restart')
    .description('Restart tenant-agent service')
    .action(async () => {
    try {
        (0, admin_1.ensureAdmin)();
        logger_1.default.info('Restarting tenant-agent service...');
        await execNssm(['stop', service_1.SERVICE_NAME], false);
        await execNssm(['start', service_1.SERVICE_NAME]);
        console.log(`✅ Service "${service_1.SERVICE_NAME}" restarted successfully`);
    }
    catch (err) {
        console.error('❌ Restart failed:', err instanceof Error ? err.message : err);
        if (err instanceof Error)
            logger_1.default.error(err.stack || err.message);
    }
});
// -----------------------------
// Status
// -----------------------------
exports.lifecycle
    .command('status')
    .description('Show tenant-agent service status')
    .action(async () => {
    try {
        if (!(0, fs_1.fileExists)(NSSM_PATH)) {
            throw new Error(`nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`);
        }
        const result = await (0, exec_1.runCommand)(NSSM_PATH, ['status', service_1.SERVICE_NAME]);
        console.log(result.stdout || result.stderr);
        logger_1.default.info(`Service status checked: ${result.stdout || result.stderr}`);
    }
    catch (err) {
        console.error('❌ Status check failed:', err instanceof Error ? err.message : err);
        if (err instanceof Error)
            logger_1.default.error(err.stack || err.message);
    }
});
//# sourceMappingURL=lifecycle.js.map