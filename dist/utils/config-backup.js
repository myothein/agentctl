"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupConfig = backupConfig;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("./logger"));
const CONFIG_FILE = path_1.default.join('C:', 'Program Files', 'TenantAgent', 'config', 'agent.env');
function backupConfig() {
    if (!fs_1.default.existsSync(CONFIG_FILE)) {
        logger_1.default.warn('Config file does not exist, skipping backup.');
        return '';
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${CONFIG_FILE}.bak.${ts}`;
    fs_1.default.copyFileSync(CONFIG_FILE, backupFile);
    logger_1.default.info(`Config backup created: ${backupFile}`);
    return backupFile;
}
//# sourceMappingURL=config-backup.js.map