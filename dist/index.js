#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const command_registry_1 = require("./cli/command-registry");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("./utils/logger"));
// EXE-safe base dir
const BASE_DIR = path_1.default.dirname(process.execPath);
// Load .env if exists
const envPath = path_1.default.join(BASE_DIR, 'config', '.env');
if (fs_1.default.existsSync(envPath)) {
    dotenv_1.default.config({ path: envPath });
    logger_1.default.info(`Loaded env from ${envPath}`);
}
// Initialize CLI
const package_json_1 = __importDefault(require("../package.json"));
const program = new commander_1.Command();
program.name('agentctl').version(package_json_1.default.version || '1.0.0');
// Register all commands
(0, command_registry_1.getCommandRegistry)().forEach(cmd => program.addCommand(cmd));
// Help option
program.helpOption('-h, --help', 'Display help for agentctl');
// Log CLI start
logger_1.default.info(`agentctl started with args: ${process.argv.slice(2).join(' ')}`);
// Parse args safely
program.parseAsync(process.argv).catch((err) => {
    if (err instanceof Error) {
        console.error('❌ CLI Error:', err.message);
        logger_1.default.error(`CLI Error: ${err.stack || err.message}`);
    }
    else {
        console.error('❌ CLI Unknown Error:', err);
        logger_1.default.error(`CLI Unknown Error: ${JSON.stringify(err)}`);
    }
});
// Show help if no arguments
if (!process.argv.slice(2).length) {
    program.outputHelp();
    logger_1.default.info('No arguments provided, displayed help.');
}
//# sourceMappingURL=index.js.map