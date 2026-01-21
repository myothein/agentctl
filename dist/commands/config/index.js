"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const commander_1 = require("commander");
const add_new_1 = require("./add-new");
const set_1 = require("./set");
const remove_1 = require("./remove");
const get_1 = require("./get");
const list_1 = require("./list");
const backup_1 = require("./backup");
const edit_1 = require("./edit");
const validate_1 = require("./validate");
const diff_1 = require("./diff");
const restore_1 = require("./restore");
const list_backups_1 = require("./list-backups");
/**
 * Root config command
 */
exports.config = new commander_1.Command('config')
    .description('Manage tenant-agent configuration')
    // Core ops
    .addCommand(add_new_1.configAddNew)
    .addCommand(set_1.configSet)
    .addCommand(remove_1.configRemove)
    .addCommand(get_1.configGet)
    .addCommand(list_1.configList)
    // Advanced ops
    .addCommand(backup_1.configBackup)
    .addCommand(edit_1.configEdit)
    .addCommand(validate_1.configValidate)
    .addCommand(diff_1.configDiff)
    .addCommand(list_backups_1.configListBackups)
    .addCommand(restore_1.configRestore);
//# sourceMappingURL=index.js.map