"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRemove = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const admin_1 = require("../../utils/admin");
const env_config_1 = require("../../utils/env-config");
const logger_1 = __importDefault(require("../../utils/logger"));
const config_backup_1 = require("../../utils/config-backup");
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
exports.configRemove = new commander_1.Command('remove')
    .argument('<key>', 'Config key')
    .description('Remove a config key')
    .action((key) => {
    (0, admin_1.ensureAdmin)();
    const config = (0, env_config_1.readEnvFile)(CONFIG_FILE);
    if (!(key in config)) {
        console.log(chalk_1.default.yellow('⚠ Key not found'));
        return;
    }
    // 🔹 Auto backup
    const backupFile = (0, config_backup_1.backupConfig)();
    if (backupFile)
        console.log(`ℹ Backup created: ${backupFile}`);
    delete config[key];
    (0, env_config_1.writeEnvFile)(CONFIG_FILE, config);
    logger_1.default.info(`Config removed: ${key}`);
    console.log(chalk_1.default.green(`✅ ${key} removed`));
    console.log('ℹ Restart tenant-agent to apply changes');
});
//# sourceMappingURL=remove.js.map