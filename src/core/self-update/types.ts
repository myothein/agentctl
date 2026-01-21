export interface UpdateFlags {
    check: boolean;   // Only check version, do not update
    yes: boolean;     // Automatically confirm update
}

export interface UpdateResult {
    updated: boolean;
    version: string;
}

export interface ReleaseInfo {
    version: string;
    assetUrl: string;
    checksum?: string;
}
