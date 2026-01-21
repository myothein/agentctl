import { ExecResult } from '../utils/exec';

/**
 * CLI command result type
 */
export interface CommandResult {
    success: boolean;
    message?: string;
    data?: any;
}

/**
 * Tenant agent configuration
 */
export interface AgentConfig {
    TENANT_ID: string;
    AGENT_PORT: number;
    LOG_LEVEL: 'info' | 'warn' | 'error' | 'debug';
    [key: string]: string | number;
}

/**
 * Service lifecycle states
 */
export type ServiceStatus = 'running' | 'stopped' | 'paused' | 'not-installed' | 'unknown';

/**
 * Lifecycle command result
 */
export interface LifecycleResult {
    status: ServiceStatus;
    code: number;
    stdout?: string;
    stderr?: string;
}

/**
 * Doctor check result
 */
export interface DoctorCheckResult {
    name: string;
    ok: boolean;
    message?: string;
}

/**
 * Update information
 */
export interface UpdateInfo {
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    filePath?: string; // local downloaded update binary
}

/**
 * Exec function return type
 */
export type ExecPromiseResult = ExecResult;
