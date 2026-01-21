"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("../constants/paths");
const logger_1 = __importDefault(require("../utils/logger"));
const DEFAULT_CONFIG = {
    TENANT_ID: 'default',
    AGENT_PORT: 4000,
    LOG_LEVEL: 'info',
};
function loadConfig() {
    const configPath = path_1.default.join(paths_1.CONFIG_DIR, 'agent.env');
    if (!fs_1.default.existsSync(configPath)) {
        logger_1.default.warn(`Config file not found at ${configPath}. Using defaults.`);
        return DEFAULT_CONFIG;
    }
    try {
        const raw = fs_1.default.readFileSync(configPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        const config = { ...DEFAULT_CONFIG };
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const [key, ...rest] = trimmed.split('=');
            const value = rest.join('=').trim();
            const numValue = Number(value);
            config[key] = isNaN(numValue) ? value : numValue;
        }
        logger_1.default.info(`Loaded config from ${configPath}`);
        return config;
    }
    catch (err) {
        logger_1.default.error(`Failed to load config: ${err instanceof Error ? err.message : err}`);
        return DEFAULT_CONFIG;
    }
}
//# sourceMappingURL=load-config.js.map