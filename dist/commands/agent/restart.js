"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restart = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
const admin_1 = require("../../utils/admin");
const exec_1 = require("../../utils/exec");
const fs_1 = require("../../utils/fs");
const service_1 = require("../../constants/service");
exports.restart = new commander_1.Command('restart')
    .description('Restart tenant-agent Windows service')
    .action(async () => {
    try {
        // -------------------------------------------------
        // 1️⃣ Admin privileges required
        // -------------------------------------------------
        (0, admin_1.ensureAdmin)();
        logger_1.default.info(`Restarting service "${service_1.SERVICE_NAME}"`);
        // -------------------------------------------------
        // 2️⃣ Fixed MSI-owned paths
        // -------------------------------------------------
        const BASE_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
        const BIN_DIR = path_1.default.join(BASE_DIR, 'bin');
        const NSSM_EXE = path_1.default.join(BIN_DIR, 'nssm.exe');
        if (!(0, fs_1.fileExists)(NSSM_EXE)) {
            throw new Error(`nssm.exe not found at ${NSSM_EXE}. The installation may be corrupted.`);
        }
        // -------------------------------------------------
        // 3️⃣ Check current service status
        // -------------------------------------------------
        const status = await (0, exec_1.runCommand)(NSSM_EXE, ['status', service_1.SERVICE_NAME]);
        if (status.code !== 0) {
            throw new Error(`Service "${service_1.SERVICE_NAME}" is not installed.`);
        }
        const isStopped = status.stdout?.includes('SERVICE_STOPPED');
        // -------------------------------------------------
        // 4️⃣ Stop service if running
        // -------------------------------------------------
        if (!isStopped) {
            logger_1.default.info('Service running → stopping');
            const stop = await (0, exec_1.runCommand)(NSSM_EXE, ['stop', service_1.SERVICE_NAME]);
            if (stop.code !== 0) {
                throw new Error(stop.stderr || stop.stdout || 'Failed to stop service');
            }
        }
        else {
            logger_1.default.info('Service already stopped');
        }
        // -------------------------------------------------
        // 5️⃣ Start service
        // -------------------------------------------------
        logger_1.default.info('Starting service');
        const start = await (0, exec_1.runCommand)(NSSM_EXE, ['start', service_1.SERVICE_NAME]);
        if (start.code !== 0) {
            throw new Error(start.stderr || start.stdout || 'Failed to start service');
        }
        console.log(`✅ Service "${service_1.SERVICE_NAME}" restarted successfully`);
        logger_1.default.info('Service restarted successfully');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Restart failed: ${message}`);
        logger_1.default.error(message);
        process.exit(1);
    }
});
//# sourceMappingURL=restart.js.map