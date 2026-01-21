import type { SQLiteDB } from '../../db/sqlite.js';

export interface Migration {
    version: number;
    name: string;
    up(db: SQLiteDB): void;
    dryRun?(db: SQLiteDB): void;
}
