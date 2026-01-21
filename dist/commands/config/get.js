"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configGet = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const env_config_1 = require("../../utils/env-config");
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
exports.configGet = new commander_1.Command('get')
    .argument('<key>', 'Config key')
    .description('Get a config value')
    .action((key) => {
    const config = (0, env_config_1.readEnvFile)(CONFIG_FILE);
    if (!(key in config)) {
        console.log('⚠ Not found');
        process.exit(1);
    }
    console.log(`${key}=${config[key]}`);
});
//# sourceMappingURL=get.js.map