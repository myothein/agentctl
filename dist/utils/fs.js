"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.copyFile = copyFile;
exports.writeFile = writeFile;
exports.readFile = readFile;
exports.fileExists = fileExists;
exports.removeFile = removeFile;
exports.removeDir = removeDir;
exports.ensureBaseDirs = ensureBaseDirs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("../constants/paths");
const logger_1 = __importDefault(require("./logger"));
// Ensure a directory exists
function ensureDir(dirPath) {
    const fullPath = path_1.default.resolve(dirPath);
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
        logger_1.default?.info(`Created directory: ${fullPath}`);
    }
}
// Copy a file, ensuring target directory exists
function copyFile(src, dest) {
    const fullSrc = path_1.default.resolve(src);
    const fullDest = path_1.default.resolve(dest);
    ensureDir(path_1.default.dirname(fullDest));
    fs_1.default.copyFileSync(fullSrc, fullDest);
    logger_1.default?.info(`Copied file: ${fullSrc} -> ${fullDest}`);
}
// Write a file
function writeFile(filePath, content) {
    const fullPath = path_1.default.resolve(filePath);
    ensureDir(path_1.default.dirname(fullPath));
    fs_1.default.writeFileSync(fullPath, content, { encoding: 'utf8' });
}
// Read a file
function readFile(filePath) {
    try {
        return fs_1.default.readFileSync(path_1.default.resolve(filePath), { encoding: 'utf8' });
    }
    catch (err) {
        logger_1.default?.error(`Failed to read file: ${filePath} - ${err}`);
        return null;
    }
}
// Check if file exists
function fileExists(filePath) {
    return fs_1.default.existsSync(path_1.default.resolve(filePath));
}
// Remove a file
function removeFile(filePath) {
    const fullPath = path_1.default.resolve(filePath);
    if (fs_1.default.existsSync(fullPath)) {
        fs_1.default.unlinkSync(fullPath);
        logger_1.default?.info(`Removed file: ${fullPath}`);
    }
}
// Remove a directory recursively
function removeDir(dirPath) {
    const fullPath = path_1.default.resolve(dirPath);
    if (fs_1.default.existsSync(fullPath)) {
        fs_1.default.rmSync(fullPath, { recursive: true, force: true });
        logger_1.default?.info(`Removed directory: ${fullPath}`);
    }
}
// Convenience: ensure all base agentctl directories
function ensureBaseDirs() {
    ensureDir(paths_1.BIN_DIR);
    ensureDir(paths_1.CONFIG_DIR);
    ensureDir(paths_1.DATA_DIR);
    ensureDir(paths_1.LOG_DIR);
}
//# sourceMappingURL=fs.js.map