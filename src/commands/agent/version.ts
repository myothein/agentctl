import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger';

export const version = new Command('version')
    .description('Show agentctl and tenant-agent versions')
    .action(() => {
        try {
            // -------------------------------------------------
            // 1️⃣ agentctl version (CLI-owned)
            // -------------------------------------------------
            // NOTE: This should be injected at build time later
            const AGENTCTL_VERSION = '1.0.0';

            console.log(`agentctl version: ${AGENTCTL_VERSION}`);
            logger.info(`agentctl version: ${AGENTCTL_VERSION}`);

            // -------------------------------------------------
            // 2️⃣ tenant-agent version (MSI-owned)
            // -------------------------------------------------
            const BASE_DIR = path.join('C:', 'Program Files', 'TenantAgent');
            const BIN_DIR = path.join(BASE_DIR, 'bin');
            const VERSION_FILE = path.join(BIN_DIR, 'VERSION');

            if (!fs.existsSync(VERSION_FILE)) {
                console.log('tenant-agent version: not installed');
                logger.warn(`VERSION file not found: ${VERSION_FILE}`);
                return;
            }

            let tenantAgentVersion: string;

            try {
                tenantAgentVersion = fs.readFileSync(VERSION_FILE, 'utf8').trim();
            } catch (readErr) {
                console.log('tenant-agent version: unreadable');
                logger.error(
                    `Failed to read VERSION file: ${
                        readErr instanceof Error ? readErr.message : readErr
                    }`
                );
                return;
            }

            if (!tenantAgentVersion) {
                console.log('tenant-agent version: unknown');
                logger.warn('VERSION file is empty');
                return;
            }

            console.log(`tenant-agent version: ${tenantAgentVersion}`);
            logger.info(`tenant-agent version: ${tenantAgentVersion}`);

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`❌ Version check failed: ${message}`);
            logger.error(message);
        }
    });
