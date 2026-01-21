"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configListBackups = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const CONFIG_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config');
exports.configListBackups = new commander_1.Command('list-backups')
    .description('List all config backups')
    .action(() => {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        console.log('⚠ No config directory found');
        return;
    }
    const backups = fs_1.default.readdirSync(CONFIG_DIR)
        .filter(f => f.startsWith('agent.env.bak.'))
        .sort();
    if (!backups.length) {
        console.log('⚠ No backups found');
        return;
    }
    console.log(chalk_1.default.blue('Available backups:'));
    backups.forEach(b => console.log(` - ${b}`));
});
//# sourceMappingURL=list-backups.js.map