"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOutboxCmd = void 0;
const commander_1 = require("commander");
const list_js_1 = require("../../core/outbox/list.js");
exports.listOutboxCmd = new commander_1.Command('list')
    .description('List available outbox backups')
    .action(async () => {
    try {
        const backups = await (0, list_js_1.listBackups)();
        if (!backups.length) {
            console.log('No backups found');
        }
        else {
            backups.forEach((b) => console.log(`- ${b}`));
        }
    }
    catch (err) {
        console.error('❌ Failed to list backups:', err.message || err);
        process.exit(1);
    }
});
//# sourceMappingURL=list.js.map