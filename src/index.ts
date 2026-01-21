#!/usr/bin/env node
import { Command } from 'commander';
import { getCommandRegistry } from './cli/command-registry';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './utils/logger';

// EXE-safe base dir
const BASE_DIR = path.dirname(process.execPath);

// Load .env if exists
const envPath = path.join(BASE_DIR, 'config', '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    logger.info(`Loaded env from ${envPath}`);
}

// Initialize CLI
import pkg from '../package.json';
const program = new Command();
program.name('agentctl').version(pkg.version || '1.0.0');

// Register all commands
getCommandRegistry().forEach(cmd => program.addCommand(cmd));

// Help option
program.helpOption('-h, --help', 'Display help for agentctl');

// Log CLI start
logger.info(`agentctl started with args: ${process.argv.slice(2).join(' ')}`);

// Parse args safely
program.parseAsync(process.argv).catch((err: unknown) => {
    if (err instanceof Error) {
        console.error('❌ CLI Error:', err.message);
        logger.error(`CLI Error: ${err.stack || err.message}`);
    } else {
        console.error('❌ CLI Unknown Error:', err);
        logger.error(`CLI Unknown Error: ${JSON.stringify(err)}`);
    }
});

// Show help if no arguments
if (!process.argv.slice(2).length) {
    program.outputHelp();
    logger.info('No arguments provided, displayed help.');
}
