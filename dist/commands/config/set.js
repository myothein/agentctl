"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSet = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const admin_1 = require("../../utils/admin");
const env_config_1 = require("../../utils/env-config");
const logger_1 = __importDefault(require("../../utils/logger"));
const config_backup_1 = require("../../utils/config-backup");
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
exports.configSet = new commander_1.Command('set')
    .argument('<pair>', 'KEY=VALUE')
    .description('Set or update a config value')
    .action((pair) => {
    (0, admin_1.ensureAdmin)();
    const [key, ...rest] = pair.split('=');
    const value = rest.join('=');
    if (!key || value === undefined) {
        console.error('❌ Use KEY=VALUE');
        process.exit(1);
    }
    const config = (0, env_config_1.readEnvFile)(CONFIG_FILE);
    const existed = key in config;
    // 🔹 Auto backup
    const backupFile = (0, config_backup_1.backupConfig)();
    if (backupFile)
        console.log(`ℹ Backup created: ${backupFile}`);
    config[key] = value;
    (0, env_config_1.writeEnvFile)(CONFIG_FILE, config);
    logger_1.default.info(`Config ${existed ? 'updated' : 'set'}: ${key}`);
    console.log(chalk_1.default.green(`✅ ${key} ${existed ? 'updated' : 'set'}`));
    console.log('ℹ Restart tenant-agent to apply changes');
});
//# sourceMappingURL=set.js.map