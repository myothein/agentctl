import Database from 'better-sqlite3';

/**
 * Shared SQLite database instance type
 * Safe for ESM + strict TypeScript
 */
export type SQLiteDB = InstanceType<typeof Database>;
