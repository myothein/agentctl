/** Never copy process.execPath (which may be node.exe) to or from a .bak file. */
export async function rollback():Promise<void>{
    throw new Error('Legacy process executable rollback is disabled');
}
