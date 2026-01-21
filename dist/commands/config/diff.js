"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configDiff = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_config_1 = require("../../utils/env-config");
const CONFIG_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'agent.env');
function findLatestBackup() {
    const files = fs_1.default.readdirSync(CONFIG_DIR)
        .filter(f => f.startsWith('agent.env.bak.'))
        .sort()
        .reverse();
    return files.length ? path_1.default.join(CONFIG_DIR, files[0]) : null;
}
exports.configDiff = new commander_1.Command('diff')
    .description('Show config changes since last backup')
    .action(() => {
    const backup = findLatestBackup();
    if (!backup) {
        console.log('⚠ No backup found');
        return;
    }
    const current = (0, env_config_1.readEnvFile)(CONFIG_FILE);
    const old = (0, env_config_1.readEnvFile)(backup);
    for (const key of new Set([...Object.keys(current), ...Object.keys(old)])) {
        if (!(key in old)) {
            console.log(`+ ${key}=${current[key]}`);
        }
        else if (!(key in current)) {
            console.log(`- ${key}`);
        }
        else if (current[key] !== old[key]) {
            console.log(`~ ${key}: ${old[key]} → ${current[key]}`);
        }
    }
});
//# sourceMappingURL=diff.js.map