"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configAddNew = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const admin_js_1 = require("../../utils/admin.js");
const env_config_1 = require("../../utils/env-config");
const config_backup_1 = require("../../utils/config-backup");
const logger_1 = __importDefault(require("../../utils/logger"));
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
exports.configAddNew = new commander_1.Command('add-new')
    .argument('<pair>', 'KEY=VALUE')
    .description('Add a new config key (fails if key exists)')
    .action((pair) => {
    (0, admin_js_1.ensureAdmin)();
    const [key, ...rest] = pair.split('=');
    const value = rest.join('=');
    if (!key || value === undefined) {
        console.error('❌ Use KEY=VALUE');
        process.exit(1);
    }
    const config = (0, env_config_1.readEnvFile)(CONFIG_FILE);
    if (key in config) {
        console.error(chalk_1.default.red(`❌ ${key} already exists`));
        process.exit(1);
    }
    // 🔹 Auto backup
    const backupFile = (0, config_backup_1.backupConfig)();
    if (backupFile)
        console.log(`ℹ Backup created: ${backupFile}`);
    config[key] = value;
    (0, env_config_1.writeEnvFile)(CONFIG_FILE, config);
    logger_1.default.info(`Config added: ${key}`);
    console.log(chalk_1.default.green(`✅ ${key} added`));
    console.log('ℹ Restart tenant-agent to apply changes');
});
//# sourceMappingURL=add-new.js.map