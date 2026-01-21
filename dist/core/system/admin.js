"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
exports.ensureAdmin = ensureAdmin;
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
/**
 * Check if the current process has admin/root privileges
 */
function isAdmin() {
    if (os_1.default.platform() !== 'win32') {
        // Unix-like: safely get UID
        let uid = -1; // default non-root
        if (typeof process.getuid === 'function') {
            const tmp = process.getuid();
            uid = typeof tmp === 'number' ? tmp : -1;
        }
        return uid === 0; // TypeScript now knows this is boolean
    }
    // Windows: try fsutil
    try {
        (0, child_process_1.execSync)('fsutil dirty query %systemdrive%', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Ensure admin privileges, exit process if not
 */
function ensureAdmin() {
    if (!isAdmin()) {
        console.error('❌ Administrator privileges are required.');
        console.error('Please run this command in an elevated terminal.');
        process.exit(1);
    }
}
//# sourceMappingURL=admin.js.map