"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const commander_1 = require("commander");
const load_config_1 = require("../../config/load-config");
const fs_1 = require("../../utils/fs");
const paths_1 = require("../../constants/paths");
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
exports.config = new commander_1.Command('config')
    .description('Manage agent configuration');
exports.config
    .command('set <keyValue>')
    .description('Set a configuration key (format: key=value)')
    .action((keyValue) => {
    try {
        // Parse key=value
        const [key, value] = keyValue.split('=');
        if (!key || value === undefined) {
            throw new Error('Invalid format. Use key=value');
        }
        // Load existing config
        const config = (0, load_config_1.loadConfig)();
        config[key] = isNaN(Number(value)) ? value : Number(value);
        // Write to agent.env in EXE-safe config directory
        const configFile = path_1.default.join(paths_1.CONFIG_DIR, 'agent.env');
        const lines = Object.entries(config).map(([k, v]) => `${k}=${v}`);
        (0, fs_1.writeFile)(configFile, lines.join('\n'));
        console.log(`✅ Config updated: ${key}=${value}`);
        logger_1.default.info(`Config updated: ${key}=${value}`);
    }
    catch (err) {
        console.error('❌ Failed to update config:', err instanceof Error ? err.message : err);
        if (err instanceof Error)
            logger_1.default.error(err.stack || err.message);
    }
});
//# sourceMappingURL=config.js.map