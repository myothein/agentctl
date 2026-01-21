"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
const admin_1 = require("../../utils/admin");
const exec_1 = require("../../utils/exec");
const fs_1 = require("../../utils/fs");
const service_1 = require("../../constants/service");
exports.stop = new commander_1.Command('stop')
    .description('Stop tenant-agent Windows service')
    .action(async () => {
    try {
        // -------------------------------------------------
        // 1️⃣ Admin privileges are required
        // -------------------------------------------------
        (0, admin_1.ensureAdmin)();
        logger_1.default.info(`Stopping service "${service_1.SERVICE_NAME}"`);
        // -------------------------------------------------
        // 2️⃣ Fixed MSI-owned layout
        // -------------------------------------------------
        const BASE_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
        const BIN_DIR = path_1.default.join(BASE_DIR, 'bin');
        const NSSM_EXE = path_1.default.join(BIN_DIR, 'nssm.exe');
        if (!(0, fs_1.fileExists)(NSSM_EXE)) {
            throw new Error(`nssm.exe not found at ${NSSM_EXE}. The product may be corrupted.`);
        }
        // -------------------------------------------------
        // 3️⃣ Check current service status
        // -------------------------------------------------
        const status = await (0, exec_1.runCommand)(NSSM_EXE, ['status', service_1.SERVICE_NAME]);
        if (status.stdout?.includes('SERVICE_STOPPED')) {
            console.log(`ℹ️ Service "${service_1.SERVICE_NAME}" is already stopped`);
            logger_1.default.info('Service already stopped');
            return;
        }
        if (status.code !== 0 && status.stderr) {
            throw new Error(`Service "${service_1.SERVICE_NAME}" is not installed.`);
        }
        // -------------------------------------------------
        // 4️⃣ Stop service
        // -------------------------------------------------
        const result = await (0, exec_1.runCommand)(NSSM_EXE, ['stop', service_1.SERVICE_NAME]);
        if (result.code !== 0) {
            throw new Error(result.stderr || result.stdout || 'Unknown NSSM error');
        }
        console.log(`✅ Service "${service_1.SERVICE_NAME}" stopped successfully`);
        logger_1.default.info('Service stopped successfully');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Stop failed: ${message}`);
        logger_1.default.error(message);
        process.exit(1);
    }
});
//# sourceMappingURL=stop.js.map