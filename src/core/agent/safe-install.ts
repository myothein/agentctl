/** Pure install orchestrator; the runner is injected for safe, non-destructive CI tests. */
export type CommandResult = { code:number; stdout:string; stderr:string };
export type InstallOptions = {
    serviceName:string;
    agentExe:string;
    ctlExe:string;
    nssmExe:string;
    binDir:string;
    configFile:string;
    fileExists:(file:string)=>boolean;
    run:(args:string[])=>Promise<CommandResult>;
};
async function mustSucceed(run:InstallOptions['run'],args:string[],label:string) {
    const result=await run(args);
    if(result.code!==0) throw new Error(label+' failed (code '+result.code+')');
}
export async function installNewService(options:InstallOptions):Promise<void> {
    // Preflight MUST finish before any change to Windows Service Control Manager.
    const files=[options.agentExe,options.ctlExe,options.nssmExe,options.configFile];
    for(const file of files) {
        if(!options.fileExists(file)) throw new Error('Install prerequisite missing: '+file);
    }
    if(!/^[a-zA-Z0-9_-]{1,64}$/.test(options.serviceName)) {
        throw new Error('Invalid service name');
    }
    const status=await options.run(['status',options.serviceName]);
    if(status.code===0) {
        throw new Error('Service already exists; install will not stop, remove or replace it');
    }
    // If NSSM fails for an unknown reason, refuse installation rather than guessing.
    const output=status.stdout+'\n'+status.stderr;
    if(!/not installed|not exist|can't open service|failed to open service|1060/i.test(output)){
        throw new Error('Service state could not be confirmed; no changes made');
    }

    let registered=false;
    try {
        await mustSucceed(options.run,['install',options.serviceName,options.agentExe],'NSSM install');
        registered=true;
        await mustSucceed(options.run,['set',options.serviceName,'AppDirectory',options.binDir],
            'NSSM AppDirectory');
        // The service is intentionally demand-start: runtime secrets/ACLs require independent QA.
        await mustSucceed(options.run,['set',options.serviceName,'Start','SERVICE_DEMAND_START'],
            'NSSM manual start');
    }catch(error){
        if(registered){
            const cleanup=await options.run(['remove',options.serviceName,'confirm']);
            if(cleanup.code!==0){
                throw new Error('Install failed and newly registered service could not be removed; manual recovery required');
            }
        }
        throw error;
    }
}
