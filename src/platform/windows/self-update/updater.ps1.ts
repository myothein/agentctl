/** No shell interpolation or PowerShell -ExecutionPolicy Bypass update may run. */
export async function runUpdater(_newBinaryPath:string):Promise<void>{
    throw new Error('Unsafe PowerShell update path is disabled');
}
