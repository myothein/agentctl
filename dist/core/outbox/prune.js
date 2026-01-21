"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pruneBackups = pruneBackups;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_js_1 = require("./paths.js");
async function pruneBackups(keep) {
    if (!fs_1.default.existsSync(paths_js_1.OUTBOX_BACKUP_DIR))
        return 0;
    const files = fs_1.default
        .readdirSync(paths_js_1.OUTBOX_BACKUP_DIR)
        .filter(f => f.endsWith('.db'))
        .map(f => ({ file: f, time: fs_1.default.statSync(path_1.default.join(paths_js_1.OUTBOX_BACKUP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);
    const toDelete = files.slice(keep);
    toDelete.forEach(f => fs_1.default.unlinkSync(path_1.default.join(paths_js_1.OUTBOX_BACKUP_DIR, f.file)));
    return toDelete.length;
}
//# sourceMappingURL=prune.js.map