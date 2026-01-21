import Database from 'better-sqlite3';
import type { SQLiteDB } from '../db/sqlite.js';

/**
 * Ensure the _meta table exists
 */
function ensureMetaTable(db: SQLiteDB): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS _meta (
                                             key TEXT PRIMARY KEY,
                                             value TEXT NOT NULL
        );
    `);
}

/**
 * Get current outbox schema version
 */
export function getDbVersion(db: SQLiteDB | string): number {
    let database: SQLiteDB;
    if (typeof db === 'string') {
        database = new Database(db);
    } else {
        database = db;
    }

    ensureMetaTable(database);

    const row = database
        .prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`)
        .get() as { value?: string } | undefined;

    if (!row || row.value === undefined) return 0;

    const version = Number(row.value);
    return Number.isInteger(version) ? version : 0;
}

/**
 * Set outbox schema version
 */
export function setDbVersion(db: SQLiteDB, version: number): void {
    ensureMetaTable(db);

    db.prepare(`
        INSERT INTO _meta (key, value)
        VALUES ('schema_version', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(version));
}

/**
 * Latest outbox schema version
 */
export const latestVersion = 3; // <-- Update this whenever you add a migration
