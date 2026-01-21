import path from 'path';

export const OUTBOX_DB = path.join(
    'C:',
    'ProgramData',
    'TenantAgent',
    'data',
    'outbox.db'
);

export const OUTBOX_BACKUP_DIR = path.join(
    'C:',
    'ProgramData',
    'TenantAgent',
    'backups',
    'outbox'
);
