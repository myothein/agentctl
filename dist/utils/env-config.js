"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEnvFile = readEnvFile;
exports.writeEnvFile = writeEnvFile;
const fs_1 = __importDefault(require("fs"));
function readEnvFile(filePath) {
    if (!fs_1.default.existsSync(filePath))
        return {};
    const lines = fs_1.default.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    const result = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const [key, ...rest] = trimmed.split('=');
        result[key] = rest.join('=');
    }
    return result;
}
function writeEnvFile(filePath, data) {
    const content = Object.entries(data)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    fs_1.default.writeFileSync(filePath, content + '\n');
}
//# sourceMappingURL=env-config.js.map