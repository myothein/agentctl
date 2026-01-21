"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
exports.ensureAdmin = ensureAdmin;
const child_process_1 = require("child_process");
function isAdmin() {
    try {
        // This command will succeed only if running as admin
        // It tries to list the SYSTEM drive ACL
        (0, child_process_1.execSync)('fsutil dirty query %systemdrive%', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
function ensureAdmin() {
    if (!isAdmin()) {
        throw new Error('Administrator privileges are required to run this command. ' +
            'Please re-run agentctl as Administrator.');
    }
}
//# sourceMappingURL=admin.js.map