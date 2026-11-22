/**
 * Fail-closed until signed update packages, verified backup, restart and automatic
 * rollback with Windows SCM test coverage are implemented. Never stop the service
 * and only then discover that the update artifact is missing.
 */
export async function applyUpdate(_updateFilePath?:string):Promise<void>{
    throw new Error('Unsafe in-place agent update blocked pending signed artifact and verified rollback');
}
