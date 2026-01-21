"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pruneOutboxCmd = void 0;
const commander_1 = require("commander");
const prune_js_1 = require("../../core/outbox/prune.js");
const admin_js_1 = require("../../core/system/admin.js");
exports.pruneOutboxCmd = new commander_1.Command('prune')
    .description('Remove old outbox backups, keeping the latest N (default 5)')
    .option('-k, --keep <number>', 'Number of backups to keep', '5')
    .action(async (options) => {
    (0, admin_js_1.ensureAdmin)();
    const keep = parseInt(options.keep, 10);
    if (isNaN(keep) || keep <= 0) {
        console.error('❌ --keep must be a positive number');
        process.exit(1);
    }
    try {
        const removed = await (0, prune_js_1.pruneBackups)(keep);
        console.log(`✅ Pruned ${removed} old backups, keeping ${keep} latest`);
    }
    catch (err) {
        console.error('❌ Prune failed:', err.message || err);
        process.exit(1);
    }
});
//# sourceMappingURL=prune.js.map