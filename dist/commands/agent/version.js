"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
exports.version = new commander_1.Command('version')
    .description('Show agentctl and tenant-agent versions')
    .action(() => {
    try {
        // -------------------------------------------------
        // 1️⃣ agentctl version (CLI-owned)
        // -------------------------------------------------
        // NOTE: This should be injected at build time later
        const AGENTCTL_VERSION = '1.0.0';
        console.log(`agentctl version: ${AGENTCTL_VERSION}`);
        logger_1.default.info(`agentctl version: ${AGENTCTL_VERSION}`);
        // -------------------------------------------------
        // 2️⃣ tenant-agent version (MSI-owned)
        // -------------------------------------------------
        const BASE_DIR = path_1.default.join('C:', 'Program Files', 'TenantAgent');
        const BIN_DIR = path_1.default.join(BASE_DIR, 'bin');
        const VERSION_FILE = path_1.default.join(BIN_DIR, 'VERSION');
        if (!fs_1.default.existsSync(VERSION_FILE)) {
            console.log('tenant-agent version: not installed');
            logger_1.default.warn(`VERSION file not found: ${VERSION_FILE}`);
            return;
        }
        let tenantAgentVersion;
        try {
            tenantAgentVersion = fs_1.default.readFileSync(VERSION_FILE, 'utf8').trim();
        }
        catch (readErr) {
            console.log('tenant-agent version: unreadable');
            logger_1.default.error(`Failed to read VERSION file: ${readErr instanceof Error ? readErr.message : readErr}`);
            return;
        }
        if (!tenantAgentVersion) {
            console.log('tenant-agent version: unknown');
            logger_1.default.warn('VERSION file is empty');
            return;
        }
        console.log(`tenant-agent version: ${tenantAgentVersion}`);
        logger_1.default.info(`tenant-agent version: ${tenantAgentVersion}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Version check failed: ${message}`);
        logger_1.default.error(message);
    }
});
//# sourceMappingURL=version.js.map