"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateOutbox = migrateOutbox;
const fs_1 = __importDefault(require("fs"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const admin_js_1 = require("../system/admin.js");
const service_manager_js_1 = require("../agent/service-manager.js");
const index_js_1 = require("./migrations/index.js");
const version_js_1 = require("./version.js");
const paths_js_1 = require("./paths.js");
function backupOutbox(dbPath) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = paths_js_1.OUTBOX_BACKUP_DIR + `/outbox.db.backup.${ts}.db`;
    if (!fs_1.default.existsSync(paths_js_1.OUTBOX_BACKUP_DIR))
        fs_1.default.mkdirSync(paths_js_1.OUTBOX_BACKUP_DIR, { recursive: true });
    fs_1.default.copyFileSync(dbPath, backupPath);
    // Copy WAL/SHM files if they exist
    for (const ext of ['-wal', '-shm']) {
        const file = dbPath + ext;
        if (fs_1.default.existsSync(file))
            fs_1.default.copyFileSync(file, backupPath + ext);
    }
    return backupPath;
}
async function migrateOutbox(options = {}) {
    (0, admin_js_1.ensureAdmin)();
    const dbPath = paths_js_1.OUTBOX_DB;
    if (!fs_1.default.existsSync(dbPath))
        throw new Error(`outbox.db not found at ${dbPath}`);
    (0, service_manager_js_1.stopServiceIfRunning)();
    let db = null;
    try {
        db = new better_sqlite3_1.default(dbPath);
        const currentVersion = (0, version_js_1.getDbVersion)(db);
        if (currentVersion === index_js_1.latestVersion) {
            console.log('✅ Outbox database is already up to date');
            return;
        }
        console.log(`🔄 Migrating outbox.db from v${currentVersion} → v${index_js_1.latestVersion}`);
        if (options.dryRun) {
            console.log('📝 Dry run – no changes will be applied');
            (0, index_js_1.runMigrations)(db, currentVersion, true);
            return;
        }
        const backupPath = backupOutbox(dbPath);
        console.log(`📦 Backup created: ${backupPath}`);
        (0, index_js_1.runMigrations)(db, currentVersion, false);
        (0, version_js_1.setDbVersion)(db, index_js_1.latestVersion);
        console.log('✅ Outbox migration completed successfully');
    }
    finally {
        try {
            db?.close();
        }
        catch { }
        (0, service_manager_js_1.startService)();
    }
}
//# sourceMappingURL=migrate.js.map