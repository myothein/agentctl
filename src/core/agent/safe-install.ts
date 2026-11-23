/** Pure install orchestrator; the runner is injected for safe, non-destructive CI tests. */
import path from 'node:path';

export type CommandResult = { code:number; stdout:string; stderr:string };
export type InstallOptions = {
    serviceName:string;
    agentExe:string;
    ctlExe:string;
    nssmExe:string;
    binDir:string;
    configFile:string;
    /** Optional Node 22 service mode: original EXE mode remains unchanged. */
    nodeAgent?: { entryFile:string; workingDir:string; runtimeVersion:string };
    fileExists:(file:string)=>boolean;
    run:(args:string[])=>Promise<CommandResult>;
};
/** Windows paths reach NSSM AppParameters; reject quoting/control/shell ambiguity. */
function requireWindowsFilePath(value:string,label:string):string {
    if (typeof value !== 'string' || !/^[A-Za-z]:\\\\/.test(value) ||
        /[\u0000-\u001f"<>|?*]/.test(value) ||
        value !== path.win32.normalize(value) ||
        value.endsWith('\\\\') || value.length > 240) {
        throw new Error('Invalid '+label+' Windows path');
    }
    return value;
}
function quoteWindowsArgument(value:string):string {
    return '"'+value+'"';
}
function nodeServiceParameters(options:InstallOptions):string|null {
    if(!options.nodeAgent)return null;
    const {entryFile,workingDir,runtimeVersion}=options.nodeAgent;
    if(!/^v22\\.\\d+\\.\\d+$/.test(runtimeVersion) ||
        !/\\\\node\\.exe$/i.test(options.agentExe)) {
        throw new Error('Node service mode requires a verified Node 22 executable');
    }
    requireWindowsFilePath(options.agentExe,'Node executable');
    requireWindowsFilePath(entryFile,'Node agent entry');
    requireWindowsFilePath(workingDir,'Node working directory');
    requireWindowsFilePath(options.configFile,'Node config');
    if(!/\\\\index\\.js$/i.test(entryFile) ||
       !entryFile.toLowerCase().includes('\\\\tenantagent\\\\app\\\\dist\\\\')) {
        throw new Error('Node service entry must be staged under TenantAgent\\\\app\\\\dist');
    }
    if (!workingDir.toLowerCase().includes('\\\\programdata\\\\tenantagent\\\\runtime')) {
        throw new Error('Node service working directory must use protected ProgramData');
    }
    // Node --env-file only passes a config FILE PATH, never secret values to SCM.
    return quoteWindowsArgument('--env-file='+options.configFile)+' '+
        quoteWindowsArgument(entryFile);
}

async function mustSucceed(run:InstallOptions['run'],args:string[],label:string) {
    const result=await run(args);
    if(result.code!==0) throw new Error(label+' failed (code '+result.code+')');
}
export async function installNewService(options:InstallOptions):Promise<void> {
    // Preflight MUST finish before any change to Windows Service Control Manager.
    const parameters=nodeServiceParameters(options);
    const files=[options.agentExe,options.ctlExe,options.nssmExe,options.configFile,
        ...(options.nodeAgent ? [options.nodeAgent.entryFile,options.nodeAgent.workingDir] : [])];
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
        await mustSucceed(options.run,['set',options.serviceName,'AppDirectory',
            options.nodeAgent?.workingDir ?? options.binDir], 'NSSM AppDirectory');
        if(parameters){
            await mustSucceed(options.run,['set',options.serviceName,'AppParameters',parameters],
                'NSSM AppParameters');
        }
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
