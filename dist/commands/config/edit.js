"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configEdit = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const admin_1 = require("../../utils/admin");
const exec_1 = require("../../utils/exec");
const fs_1 = require("../../utils/fs");
const CONFIG_FILE = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');
exports.configEdit = new commander_1.Command('edit')
    .description('Edit config file in Notepad')
    .action(async () => {
    (0, admin_1.ensureAdmin)();
    if (!(0, fs_1.fileExists)(CONFIG_FILE)) {
        (0, fs_1.writeFile)(CONFIG_FILE, '');
    }
    await (0, exec_1.runCommand)('notepad.exe', [CONFIG_FILE]);
});
//# sourceMappingURL=edit.js.map