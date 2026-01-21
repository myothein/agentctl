"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbVersion = getDbVersion;
exports.setDbVersion = setDbVersion;
/**
 * Ensure the _meta table exists
 */
function ensureMetaTable(db) {
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
function getDbVersion(db) {
    ensureMetaTable(db);
    const row = db
        .prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`)
        .get();
    if (!row || row.value === undefined)
        return 0;
    const version = Number(row.value);
    return Number.isInteger(version) ? version : 0;
}
/**
 * Set outbox schema version
 */
function setDbVersion(db, version) {
    ensureMetaTable(db);
    db.prepare(`
        INSERT INTO _meta (key, value)
        VALUES ('schema_version', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(version));
}
//# sourceMappingURL=version.js.map