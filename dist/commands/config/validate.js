"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configValidate = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const env_config_1 = require("../../utils/env-config");
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
const REQUIRED_KEYS = ['TENANT_ID', 'AGENT_PORT', 'LOG_LEVEL'];
exports.configValidate = new commander_1.Command('validate')
    .description('Validate configuration file')
    .action(() => {
    const config = (0, env_config_1.readEnvFile)(CONFIG_FILE);
    let valid = true;
    for (const key of REQUIRED_KEYS) {
        if (!config[key]) {
            console.error(`❌ Missing required key: ${key}`);
            valid = false;
        }
    }
    if (config.AGENT_PORT && isNaN(Number(config.AGENT_PORT))) {
        console.error('❌ AGENT_PORT must be a number');
        valid = false;
    }
    if (valid) {
        console.log('✅ Configuration is valid');
    }
    else {
        process.exit(1);
    }
});
//# sourceMappingURL=validate.js.map