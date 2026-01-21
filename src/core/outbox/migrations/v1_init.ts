import type { Migration } from './types.js';
import type { SQLiteDB } from '../../db/sqlite.js';

export const v1Init: Migration = {
    version: 1,
    name: 'Initial outbox schema',
    up(db: SQLiteDB) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS outbox (
                                                  id TEXT PRIMARY KEY,
                                                  payload TEXT NOT NULL,
                                                  status TEXT NOT NULL,
                                                  created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS _meta (
                                                 key TEXT PRIMARY KEY,
                                                 value TEXT NOT NULL
            );

            INSERT OR IGNORE INTO _meta (key, value)
      VALUES ('schema_version', '1');
        `);
    },
};
