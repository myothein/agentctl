import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger, format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import Transport from 'winston-transport';

// -----------------------------
// EXE-safe ConsoleTransport
// -----------------------------
class ConsoleTransport extends Transport {
    log(info: any, callback: () => void) {
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
const LOG_DIR = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'agentctl',
    'logs'
);
fs.mkdirSync(LOG_DIR, { recursive: true });

// -----------------------------
// File transport (daily rotation)
// -----------------------------
const fileTransport: Transport = new DailyRotateFile({
    filename: path.join(LOG_DIR, '%DATE%-agentctl.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});

fileTransport.on('error', (err: Error) => {
    console.error('Logger file error:', err.message);
});

// -----------------------------
// Console transport (dev only)
// -----------------------------
const consoleTransport: Transport = new ConsoleTransport();

// -----------------------------
// Logger
// -----------------------------
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: isDev ? [consoleTransport, fileTransport] : [fileTransport],
});

export default logger;
