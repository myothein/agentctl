"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupOutbox = backupOutbox;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const admin_js_1 = require("../system/admin.js");
const paths_js_1 = require("./paths.js");
const service_manager_js_1 = require("../agent/service-manager.js");
/**
 * Create a timestamped backup of outbox.db
 * Stops tenant-agent service during backup
 */
function backupOutbox() {
    (0, admin_js_1.ensureAdmin)();
    (0, service_manager_js_1.stopServiceIfRunning)();
    try {
        // Ensure backup directory exists
        fs_1.default.mkdirSync(paths_js_1.OUTBOX_BACKUP_DIR, { recursive: true });
        // Generate timestamped backup file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const target = path_1.default.join(paths_js_1.OUTBOX_BACKUP_DIR, `outbox-${timestamp}.db`);
        // Copy main database file
        fs_1.default.copyFileSync(paths_js_1.OUTBOX_DB, target);
        // Copy WAL/SHM files if they exist
        for (const ext of ['-wal', '-shm']) {
            const file = paths_js_1.OUTBOX_DB + ext;
            if (fs_1.default.existsSync(file))
                fs_1.default.copyFileSync(file, target + ext);
        }
        console.log(`📦 Backup created: ${target}`);
        return target;
    }
    finally {
        // Always restart service
        (0, service_manager_js_1.startService)();
    }
}
//# sourceMappingURL=backup.js.map