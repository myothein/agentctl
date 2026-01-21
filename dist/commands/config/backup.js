"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configBackup = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const admin_1 = require("../../utils/admin");
const fs_2 = require("../../utils/fs");
const logger_1 = __importDefault(require("../../utils/logger"));
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
exports.configBackup = new commander_1.Command('backup')
    .description('Backup current config file')
    .action(() => {
    (0, admin_1.ensureAdmin)();
    if (!(0, fs_2.fileExists)(CONFIG_FILE)) {
        console.error('❌ Config file not found');
        process.exit(1);
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${CONFIG_FILE}.bak.${ts}`;
    fs_1.default.copyFileSync(CONFIG_FILE, backupFile);
    logger_1.default.info(`Config backup created: ${backupFile}`);
    console.log(`✅ Backup created: ${backupFile}`);
});
//# sourceMappingURL=backup.js.map