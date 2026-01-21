"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = listBackups;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_js_1 = require("./paths.js");
/**
 * List all outbox.db backups
 * @returns Array of backup filenames, newest first
 */
async function listBackups() {
    if (!fs_1.default.existsSync(paths_js_1.OUTBOX_BACKUP_DIR))
        return [];
    // Get all .db files
    const files = fs_1.default
        .readdirSync(paths_js_1.OUTBOX_BACKUP_DIR)
        .filter((f) => f.endsWith('.db'))
        .map((file) => {
        const fullPath = path_1.default.join(paths_js_1.OUTBOX_BACKUP_DIR, file);
        const stats = fs_1.default.statSync(fullPath);
        return { file, mtime: stats.mtimeMs };
    })
        // Sort newest first
        .sort((a, b) => b.mtime - a.mtime)
        .map((f) => f.file);
    return files;
}
//# sourceMappingURL=list.js.map