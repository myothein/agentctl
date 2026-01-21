import fs from 'fs';
import path from 'path';
import { CONFIG_DIR } from '../constants/paths';
import logger from '../utils/logger';

export interface AgentConfig {
    TENANT_ID: string;
    AGENT_PORT: number;
    LOG_LEVEL: 'info' | 'warn' | 'error' | 'debug';
    [key: string]: string | number;
}

const DEFAULT_CONFIG: AgentConfig = {
    TENANT_ID: 'default',
    AGENT_PORT: 4000,
    LOG_LEVEL: 'info',
};

export function loadConfig(): AgentConfig {
    const configPath = path.join(CONFIG_DIR, 'agent.env');

    if (!fs.existsSync(configPath)) {
        logger.warn(`Config file not found at ${configPath}. Using defaults.`);
        return DEFAULT_CONFIG;
    }

    try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const lines = raw.split(/\r?\n/);

        const config: Record<string, string | number> = { ...DEFAULT_CONFIG };

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const [key, ...rest] = trimmed.split('=');
            const value = rest.join('=').trim();
            const numValue = Number(value);

            config[key] = isNaN(numValue) ? value : numValue;
        }

        logger.info(`Loaded config from ${configPath}`);
        return config as AgentConfig;
    } catch (err: unknown) {
        logger.error(`Failed to load config: ${err instanceof Error ? err.message : err}`);
        return DEFAULT_CONFIG;
    }
}
