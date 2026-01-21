"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTBOX_BACKUP_DIR = exports.OUTBOX_DB = void 0;
const path_1 = __importDefault(require("path"));
exports.OUTBOX_DB = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'data', 'outbox.db');
exports.OUTBOX_BACKUP_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'backups', 'outbox');
//# sourceMappingURL=paths.js.map