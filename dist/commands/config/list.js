"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configList = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const env_config_1 = require("../../utils/env-config");
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
exports.configList = new commander_1.Command('list')
    .description('List all config values')
    .action(() => {
    const config = (0, env_config_1.readEnvFile)(CONFIG_FILE);
    if (Object.keys(config).length === 0) {
        console.log('⚠ No config values found');
        return;
    }
    for (const [key, value] of Object.entries(config)) {
        console.log(`${key}=${value}`);
    }
});
//# sourceMappingURL=list.js.map