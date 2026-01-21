"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v1Init = void 0;
exports.v1Init = {
    version: 1,
    name: 'Initial outbox schema',
    up(db) {
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
//# sourceMappingURL=v1_init.js.map