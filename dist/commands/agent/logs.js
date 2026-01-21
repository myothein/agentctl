"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logs = void 0;
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("../../constants/paths");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Get the latest log file in a directory
 */
function getLatestLogFile(dir) {
    if (!fs_1.default.existsSync(dir))
        return null;
    const files = fs_1.default.readdirSync(dir)
        .filter(f => f.endsWith('.log'))
        .map(f => ({ file: f, time: fs_1.default.statSync(path_1.default.join(dir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
    return files.length ? path_1.default.join(dir, files[0].file) : null;
}
/**
 * Read last n lines of a file
 */
function readLastLines(file, n = 100) {
    const content = fs_1.default.readFileSync(file, 'utf-8').split(/\r?\n/);
    return content.slice(-n).join('\n');
}
exports.logs = new commander_1.Command('logs')
    .description('Show last 100 lines of tenant-agent logs')
    .action(() => {
    try {
        const logFile = getLatestLogFile(paths_1.AGENT_LOG_DIR);
        if (!logFile) {
            console.log('No logs found');
            logger_1.default.info('No tenant-agent logs found to display');
            return;
        }
        console.log(`Showing last 100 lines of ${path_1.default.basename(logFile)}:\n`);
        const output = readLastLines(logFile, 100);
        console.log(output);
        logger_1.default.info(`Displayed last 100 lines of ${path_1.default.basename(logFile)}`);
    }
    catch (err) {
        console.error('❌ Failed to read logs:', err instanceof Error ? err.message : err);
        if (err instanceof Error)
            logger_1.default.error(err.stack || err.message);
    }
});
//# sourceMappingURL=logs.js.map