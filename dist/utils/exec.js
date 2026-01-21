"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = runCommand;
const child_process_1 = require("child_process");
const logger_1 = __importDefault(require("./logger"));
/**
 * Run an external command safely (EXE-safe).
 * @param command Path to executable or command name
 * @param args Arguments array
 * @param options.silent Suppress console logging
 * @returns Promise<ExecResult>
 */
function runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const fullCommand = `${command} ${args.join(' ')}`;
        if (!options.silent) {
            console.log(`> Running: ${fullCommand}`);
            logger_1.default.info(`Running command: ${fullCommand}`);
        }
        // Execute the file
        (0, child_process_1.execFile)(command, args, { windowsHide: true }, (error, stdout, stderr) => {
            const result = {
                code: 0,
                stdout: stdout.toString(),
                stderr: stderr.toString(),
            };
            if (error) {
                // If it's an ExecException with code, return code
                result.code = typeof error.code === 'number' ? error.code : 1;
                if (!options.silent) {
                    console.error(`❌ Command failed: ${fullCommand}`);
                    console.error(stderr.toString());
                }
                logger_1.default.error(`Command failed: ${fullCommand}, stderr: ${stderr}`);
            }
            else {
                if (!options.silent) {
                    console.log(stdout.toString());
                }
                logger_1.default.info(`Command succeeded: ${fullCommand}`);
            }
            resolve(result);
        });
    });
}
//# sourceMappingURL=exec.js.map