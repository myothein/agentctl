"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const winston_1 = require("winston");
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const winston_transport_1 = __importDefault(require("winston-transport"));
// -----------------------------
// EXE-safe ConsoleTransport
// -----------------------------
class ConsoleTransport extends winston_transport_1.default {
    log(info, callback) {
        setImmediate(() => this.emit('logged', info));
        console.log(`[${info.level.toUpperCase()}] ${info.message}`);
        callback();
    }
}
// -----------------------------
// Environment
// -----------------------------
const isDev = process.env.NODE_ENV !== 'production';
// -----------------------------
// EXE-safe log directory
// -----------------------------
const LOG_DIR = path_1.default.join(process.env.LOCALAPPDATA || path_1.default.join(os_1.default.homedir(), 'AppData', 'Local'), 'agentctl', 'logs');
fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
// -----------------------------
// File transport (daily rotation)
// -----------------------------
const fileTransport = new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(LOG_DIR, '%DATE%-agentctl.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});
fileTransport.on('error', (err) => {
    console.error('Logger file error:', err.message);
});
// -----------------------------
// Console transport (dev only)
// -----------------------------
const consoleTransport = new ConsoleTransport();
// -----------------------------
// Logger
// -----------------------------
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`)),
    transports: isDev ? [consoleTransport, fileTransport] : [fileTransport],
});
exports.default = logger;
//# sourceMappingURL=logger.js.map