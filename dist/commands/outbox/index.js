"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outbox = void 0;
const commander_1 = require("commander");
const backup_js_1 = require("./backup.js");
const restore_js_1 = require("./restore.js");
const list_js_1 = require("./list.js");
const prune_js_1 = require("./prune.js");
const migrate_js_1 = require("./migrate.js");
/**
 * Root outbox command
 */
exports.outbox = new commander_1.Command('outbox')
    .description('Manage outbox database (outbox.db)')
    .addCommand(backup_js_1.backupOutboxCmd)
    .addCommand(restore_js_1.restoreOutboxCmd)
    .addCommand(list_js_1.listOutboxCmd)
    .addCommand(prune_js_1.pruneOutboxCmd)
    .addCommand(migrate_js_1.migrateOutboxCmd);
//# sourceMappingURL=index.js.map