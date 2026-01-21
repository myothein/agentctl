"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreOutboxCmd = void 0;
const commander_1 = require("commander");
const restore_js_1 = require("../../core/outbox/restore.js");
const admin_js_1 = require("../../core/system/admin.js");
const prompt_js_1 = require("../../core/utils/prompt.js");
exports.restoreOutboxCmd = new commander_1.Command('restore')
    .description('Restore outbox.db from backup')
    .argument('<backupFile>', 'Backup filename to restore')
    .action(async (backupFile) => {
    (0, admin_js_1.ensureAdmin)();
    const backups = await (0, restore_js_1.listBackups)();
    if (!backups.includes(backupFile)) {
        console.error(`❌ Backup "${backupFile}" not found`);
        process.exit(1);
    }
    const confirm = await (0, prompt_js_1.promptConfirm)(`⚠ This will overwrite the current outbox.db. Type RESTORE to continue`);
    if (!confirm) {
        console.log('Aborted by user');
        process.exit(0);
    }
    try {
        await (0, restore_js_1.restoreOutbox)(backupFile);
        console.log(`✅ Outbox restored from: ${backupFile}`);
    }
    catch (err) {
        console.error('❌ Restore failed:', err.message || err);
        process.exit(1);
    }
});
//# sourceMappingURL=restore.js.map