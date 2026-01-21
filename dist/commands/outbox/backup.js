"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupOutboxCmd = void 0;
const commander_1 = require("commander");
const backup_js_1 = require("../../core/outbox/backup.js");
const admin_js_1 = require("../../core/system/admin.js");
exports.backupOutboxCmd = new commander_1.Command('backup')
    .description('Backup outbox.db safely')
    .action(async () => {
    (0, admin_js_1.ensureAdmin)();
    try {
        const file = await (0, backup_js_1.backupOutbox)();
        console.log(`✅ Outbox backed up to: ${file}`);
    }
    catch (err) {
        console.error('❌ Backup failed:', err.message || err);
        process.exit(1);
    }
});
//# sourceMappingURL=backup.js.map