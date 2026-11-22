/** Never back up or modify process.execPath as an updater target. */
export async function prepareUpdate(_version:string):Promise<string>{
    throw new Error('Legacy self-update staging is disabled');
}
