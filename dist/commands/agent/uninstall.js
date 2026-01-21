"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uninstall = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const readline_1 = __importDefault(require("readline"));
const logger_1 = __importDefault(require("../../utils/logger"));
const admin_1 = require("../../utils/admin");
const fs_1 = require("../../utils/fs");
const service_1 = require("../../constants/service");
const exec_1 = require("../../utils/exec");
// SHA-256 hash of uninstall password
const PASSWORD_HASH = '556062553bf8fd1b3a295bbc956975943f33f3228b63446df12a75c0144d57db';
// Directories to remove
const BIN_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
const DATA_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent');
const NSSM_PATH = path_1.default.join(BIN_DIR, 'bin', 'nssm.exe');
exports.uninstall = new commander_1.Command('uninstall')
    .description('Uninstall tenant-agent service and remove all files')
    .action(async () => {
    try {
        logger_1.default.info('Starting tenant-agent uninstallation');
        // 1️⃣ Ensure admin
        (0, admin_1.ensureAdmin)();
        logger_1.default.info('Admin privileges confirmed');
        // 2️⃣ Prompt password
        const password = await promptHidden('Enter uninstall password: ');
        if (!verifyPassword(password)) {
            console.error('❌ Invalid password. Uninstall aborted.');
            logger_1.default.warn('Invalid uninstall password entered');
            return;
        }
        console.log('✅ Password verified');
        logger_1.default.info('Uninstall password verified');
        // 3️⃣ Stop and remove service if NSSM exists
        if ((0, fs_1.fileExists)(NSSM_PATH)) {
            await stopAndRemoveService();
        }
        else {
            logger_1.default.warn('nssm.exe not found, skipping service stop/remove');
        }
        // 4️⃣ Remove TenantAgent in Program Files
        if ((0, fs_1.fileExists)(BIN_DIR)) {
            logger_1.default.info(`Removing TenantAgent folder: ${BIN_DIR}`);
            (0, fs_1.removeDir)(BIN_DIR);
            logger_1.default.info('TenantAgent Program Files folder removed successfully');
        }
        else {
            logger_1.default.warn('TenantAgent Program Files folder not found, skipping removal');
        }
        // 5️⃣ Remove TenantAgent in ProgramData
        if ((0, fs_1.fileExists)(DATA_DIR)) {
            logger_1.default.info(`Removing TenantAgent folder: ${DATA_DIR}`);
            (0, fs_1.removeDir)(DATA_DIR);
            logger_1.default.info('TenantAgent ProgramData folder removed successfully');
        }
        else {
            logger_1.default.warn('TenantAgent ProgramData folder not found, skipping removal');
        }
        console.log('✅ Tenant-agent uninstalled successfully');
        logger_1.default.info('Tenant-agent uninstallation completed');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        console.error('❌ Uninstall failed:', message);
        logger_1.default.error(message);
    }
});
// -----------------------------
// Helper: Stop & remove service
// -----------------------------
async function stopAndRemoveService() {
    try {
        logger_1.default.info(`Stopping service "${service_1.SERVICE_NAME}"...`);
        const stopResult = await (0, exec_1.runCommand)(NSSM_PATH, ['stop', service_1.SERVICE_NAME]);
        logger_1.default.info(`Service stop stdout: ${stopResult.stdout}`);
        logger_1.default.info(`Service stop stderr: ${stopResult.stderr}`);
    }
    catch (err) {
        logger_1.default.warn(`Failed to stop service: ${err.message}`);
    }
    try {
        logger_1.default.info(`Removing service "${service_1.SERVICE_NAME}"...`);
        const removeResult = await (0, exec_1.runCommand)(NSSM_PATH, ['remove', service_1.SERVICE_NAME, 'confirm']);
        logger_1.default.info(`Service remove stdout: ${removeResult.stdout}`);
        logger_1.default.info(`Service remove stderr: ${removeResult.stderr}`);
    }
    catch (err) {
        logger_1.default.warn(`Failed to remove service: ${err.message}`);
    }
}
// -----------------------------
// Prompt hidden input (password)
// -----------------------------
function promptHidden(query) {
    return new Promise((resolve) => {
        const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
        const stdin = process.stdin;
        stdin.setRawMode?.(true);
        let password = '';
        process.stdout.write(query);
        const onData = (char) => {
            const s = char.toString('utf8');
            if (s === '\r' || s === '\n') {
                stdin.off('data', onData);
                stdin.setRawMode?.(false);
                console.log();
                rl.close();
                resolve(password);
            }
            else if (s === '\u0003') { // Ctrl+C
                process.exit();
            }
            else if (s === '\u0008' || s === '\u007F') { // Backspace
                password = password.slice(0, -1);
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(query + '*'.repeat(password.length));
            }
            else {
                password += s;
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(query + '*'.repeat(password.length));
            }
        };
        stdin.on('data', onData);
    });
}
// -----------------------------
// Verify SHA-256 password
// -----------------------------
function verifyPassword(password) {
    const hash = crypto_1.default.createHash('sha256').update(password).digest('hex');
    return hash === PASSWORD_HASH;
}
//# sourceMappingURL=uninstall.js.map