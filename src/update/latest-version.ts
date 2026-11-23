/** Version metadata must come from an authenticated, verified release manifest.
 * A fabricated version and an imaginary temp file are never a valid update.
 */
export interface LatestVersion {
    version: string;
    filePath: string;
}

export async function getLatestVersion(): Promise<LatestVersion> {
    throw new Error('Remote update unavailable: signed manifest and approved release source not configured');
}
