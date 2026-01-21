import fs from 'fs';
import path from 'path';
import { BIN_DIR, CONFIG_DIR, DATA_DIR, LOG_DIR } from '../constants/paths';
import logger from './logger';

// Ensure a directory exists
export function ensureDir(dirPath: string): void {
    const fullPath = path.resolve(dirPath);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        logger?.info(`Created directory: ${fullPath}`);
    }
}

// Copy a file, ensuring target directory exists
export function copyFile(src: string, dest: string): void {
    const fullSrc = path.resolve(src);
    const fullDest = path.resolve(dest);
    ensureDir(path.dirname(fullDest));
    fs.copyFileSync(fullSrc, fullDest);
    logger?.info(`Copied file: ${fullSrc} -> ${fullDest}`);
}

// Write a file
export function writeFile(filePath: string, content: string): void {
    const fullPath = path.resolve(filePath);
    ensureDir(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content, { encoding: 'utf8' });
}

// Read a file
export function readFile(filePath: string): string | null {
    try {
        return fs.readFileSync(path.resolve(filePath), { encoding: 'utf8' });
    } catch (err) {
        logger?.error(`Failed to read file: ${filePath} - ${err}`);
        return null;
    }
}

// Check if file exists
export function fileExists(filePath: string): boolean {
    return fs.existsSync(path.resolve(filePath));
}

// Remove a file
export function removeFile(filePath: string): void {
    const fullPath = path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger?.info(`Removed file: ${fullPath}`);
    }
}

// Remove a directory recursively
export function removeDir(dirPath: string): void {
    const fullPath = path.resolve(dirPath);
    if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        logger?.info(`Removed directory: ${fullPath}`);
    }
}

// Convenience: ensure all base agentctl directories
export function ensureBaseDirs(): void {
    ensureDir(BIN_DIR);
    ensureDir(CONFIG_DIR);
    ensureDir(DATA_DIR);
    ensureDir(LOG_DIR);
}
