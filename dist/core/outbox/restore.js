"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = listBackups;
exports.restoreOutbox = restoreOutbox;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const admin_js_1 = require("../system/admin.js");
const service_manager_js_1 = require("../agent/service-manager.js");
const paths_js_1 = require("./paths.js");
/**
 * List all existing outbox backups
 */
function listBackups() {
    if (!fs_1.default.existsSync(paths_js_1.OUTBOX_BACKUP_DIR))
        return [];
    return fs_1.default.readdirSync(paths_js_1.OUTBOX_BACKUP_DIR).filter(f => f.endsWith('.db'));
}
/**
 * Restore outbox.db from a backup file
 * Stops tenant-agent service before restore and starts it after
 */
function restoreOutbox(backupFile) {
    (0, admin_js_1.ensureAdmin)();
    (0, service_manager_js_1.stopService)();
    try {
        const src = path_1.default.join(paths_js_1.OUTBOX_BACKUP_DIR, backupFile);
        if (!fs_1.default.existsSync(src))
            throw new Error(`Backup not found: ${backupFile}`);
        // Copy main DB file
        fs_1.default.copyFileSync(src, paths_js_1.OUTBOX_DB);
        // Copy WAL and SHM files if they exist
        for (const ext of ['-wal', '-shm']) {
            if (fs_1.default.existsSync(src + ext))
                fs_1.default.copyFileSync(src + ext, paths_js_1.OUTBOX_DB + ext);
        }
        console.log(`✅ Restored outbox.db from backup: ${backupFile}`);
    }
    finally {
        (0, service_manager_js_1.startService)();
    }
}
//# sourceMappingURL=restore.js.map