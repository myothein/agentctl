"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.status = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const exec_1 = require("../../utils/exec");
const fs_1 = require("../../utils/fs");
const service_1 = require("../../constants/service");
const logger_1 = __importDefault(require("../../utils/logger"));
exports.status = new commander_1.Command('status')
    .description('Show tenant-agent service status')
    .action(async () => {
    try {
        // -----------------------------
        // 1️⃣ Determine EXE-safe NSSM path
        // -----------------------------
        const BASE_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
        const BIN_DIR = path_1.default.join(BASE_DIR, 'bin');
        const NSSM_PATH = path_1.default.join(BIN_DIR, 'nssm.exe');
        if (!(0, fs_1.fileExists)(NSSM_PATH)) {
            throw new Error(`nssm.exe not found in ${BIN_DIR}. Please reinstall tenant-agent.`);
        }
        // -----------------------------
        // 2️⃣ Check service status
        // -----------------------------
        logger_1.default.info(`Checking status of service "${service_1.SERVICE_NAME}"...`);
        const result = await (0, exec_1.runCommand)(NSSM_PATH, ['status', service_1.SERVICE_NAME]);
        logger_1.default.info(`NSSM stdout: ${result.stdout}`);
        logger_1.default.info(`NSSM stderr: ${result.stderr}`);
        const output = result.stdout || result.stderr || 'Service status unknown';
        console.log(`ℹ️ Status for "${service_1.SERVICE_NAME}":\n${output}`);
    }
    catch (err) {
        console.error('❌ Status check failed:', err instanceof Error ? err.message : err);
        if (err instanceof Error)
            logger_1.default.error(err.stack || err.message);
    }
});
//# sourceMappingURL=status.js.map