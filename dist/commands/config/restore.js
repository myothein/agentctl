"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRestore = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const admin_1 = require("../../utils/admin");
const env_config_1 = require("../../utils/env-config");
const logger_1 = __importDefault(require("../../utils/logger"));
const CONFIG_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'agent.env');
// Find latest backup
function findLatestBackup() {
    if (!fs_1.default.existsSync(CONFIG_DIR))
        return null;
    const files = fs_1.default.readdirSync(CONFIG_DIR)
        .filter(f => f.startsWith('agent.env.bak.'))
        .sort()
        .reverse();
    return files.length ? path_1.default.join(CONFIG_DIR, files[0]) : null;
}
// Prompt confirmation
function promptConfirm(question) {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => {
        rl.question(question + ' (y/n) ', answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}
exports.configRestore = new commander_1.Command('restore')
    .argument('[backup]', 'Backup file to restore (latest if omitted)')
    .description('Restore config from a backup')
    .action(async (backup) => {
    (0, admin_1.ensureAdmin)();
    const backupFile = backup
        ? path_1.default.join(CONFIG_DIR, backup)
        : findLatestBackup();
    if (!backupFile || !fs_1.default.existsSync(backupFile)) {
        console.error(chalk_1.default.red('❌ Backup not found'));
        process.exit(1);
    }
    const confirm = await promptConfirm(`Are you sure you want to restore ${path_1.default.basename(backupFile)}?`);
    if (!confirm) {
        console.log('❌ Restore cancelled');
        return;
    }
    const backupConfig = (0, env_config_1.readEnvFile)(backupFile);
    // Optional: backup current config before overwrite
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackupFile = `${CONFIG_FILE}.pre-restore.${ts}`;
    fs_1.default.copyFileSync(CONFIG_FILE, currentBackupFile);
    logger_1.default.info(`Current config backed up to ${currentBackupFile}`);
    console.log(`ℹ Current config backed up to ${currentBackupFile}`);
    (0, env_config_1.writeEnvFile)(CONFIG_FILE, backupConfig);
    logger_1.default.info(`Config restored from backup: ${backupFile}`);
    console.log(chalk_1.default.green(`✅ Config restored from ${path_1.default.basename(backupFile)}`));
    console.log('ℹ Restart tenant-agent to apply changes');
});
//# sourceMappingURL=restore.js.map