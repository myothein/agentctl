"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateOutboxCmd = void 0;
const commander_1 = require("commander");
const migrate_js_1 = require("../../core/outbox/migrate.js");
exports.migrateOutboxCmd = new commander_1.Command('migrate')
    .description('Migrate outbox.db schema to latest version')
    .option('--dry-run', 'Show what migrations would run')
    .action(async (opts) => {
    await (0, migrate_js_1.migrateOutbox)({ dryRun: !!opts.dryRun });
});
//# sourceMappingURL=migrate.js.map