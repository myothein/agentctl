"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyUpdate = applyUpdate;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const exec_1 = require("../utils/exec");
const service_1 = require("../constants/service");
const admin_1 = require("../utils/admin");
const paths_1 = require("../constants/paths");
async function applyUpdate(updateFilePath) {
    (0, admin_1.ensureAdmin)();
    if (!updateFilePath) {
        throw new Error('Update file path not provided');
    }
    const DEST_BINARY = path_1.default.join(paths_1.BIN_DIR, 'tenant-agent.exe');
    const NSSM_PATH = path_1.default.join(paths_1.BIN_DIR, 'nssm.exe');
    if (!fs_1.default.existsSync(updateFilePath)) {
        throw new Error(`Update file not found: ${updateFilePath}`);
    }
    // Stop service
    await (0, exec_1.runCommand)(NSSM_PATH, ['stop', service_1.SERVICE_NAME]);
    // Replace binary
    fs_1.default.copyFileSync(updateFilePath, DEST_BINARY);
    // Start service
    await (0, exec_1.runCommand)(NSSM_PATH, ['start', service_1.SERVICE_NAME]);
}
//# sourceMappingURL=apply.js.map