import path from 'path';
import { BIN_DIR } from './paths';

export const SERVICE_NAME = 'tenant-agent';

// Version file stored alongside binaries
export const VERSION_FILE = path.join(BIN_DIR, 'VERSION');
