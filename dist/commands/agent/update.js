"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const admin_1 = require("../../utils/admin");
const exec_1 = require("../../utils/exec");
const fs_1 = require("../../utils/fs");
const apply_1 = require("../../update/apply");
const service_1 = require("../../constants/service");
const logger_1 = __importDefault(require("../../utils/logger"));
exports.update = new commander_1.Command('update')
    .description('Update tenant-agent to the latest version')
    .action(async () => {
    try {
        // -------------------------------------------------
        // 1️⃣ Require admin
        // -------------------------------------------------
        (0, admin_1.ensureAdmin)();
        logger_1.default.info('Admin privileges confirmed');
        console.log('🔒 Admin privileges confirmed');
        // -------------------------------------------------
        // 2️⃣ Resolve MSI-owned NSSM path
        // -------------------------------------------------
        const BASE_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
        const BIN_DIR = path_1.default.join(BASE_DIR, 'bin');
        const NSSM_EXE = path_1.default.join(BIN_DIR, 'nssm.exe');
        if (!(0, fs_1.fileExists)(NSSM_EXE)) {
            throw new Error('nssm.exe not found. Tenant Agent may not be installed.');
        }
        // -------------------------------------------------
        // 3️⃣ Verify service exists
        // -------------------------------------------------
        const status = await (0, exec_1.runCommand)(NSSM_EXE, ['status', service_1.SERVICE_NAME]);
        if (status.code !== 0) {
            throw new Error(`Service "${service_1.SERVICE_NAME}" not found. Update aborted.`);
        }
        const isStopped = status.stdout?.includes('SERVICE_STOPPED');
        // -------------------------------------------------
        // 4️⃣ Stop service if running
        // -------------------------------------------------
        if (!isStopped) {
            logger_1.default.info('Stopping service before update');
            console.log('⏹️ Stopping tenant-agent service...');
            const stop = await (0, exec_1.runCommand)(NSSM_EXE, ['stop', service_1.SERVICE_NAME]);
            if (stop.code !== 0) {
                throw new Error(stop.stderr || stop.stdout || 'Failed to stop service');
            }
        }
        // -------------------------------------------------
        // 5️⃣ Apply update
        // -------------------------------------------------
        logger_1.default.info('Applying tenant-agent update');
        console.log('⬇️ Applying tenant-agent update...');
        await (0, apply_1.applyUpdate)();
        // -------------------------------------------------
        // 6️⃣ Restart service
        // -------------------------------------------------
        logger_1.default.info('Starting service after update');
        console.log('▶️ Starting tenant-agent service...');
        const start = await (0, exec_1.runCommand)(NSSM_EXE, ['start', service_1.SERVICE_NAME]);
        if (start.code !== 0) {
            throw new Error(start.stderr || start.stdout || 'Failed to start service');
        }
        // -------------------------------------------------
        // 7️⃣ Success
        // -------------------------------------------------
        console.log('✅ Tenant-agent update completed successfully');
        logger_1.default.info('Tenant-agent update completed successfully');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Update failed: ${message}`);
        logger_1.default.error(message);
        process.exit(1);
    }
});
//# sourceMappingURL=update.js.map