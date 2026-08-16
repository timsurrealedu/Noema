import {ensureDataDirs,loadConfig} from "../../../../../server/config.mjs";
import {runCode} from "../../../../../server/compiler.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{requireWorkspace(request,"editor");const config=ensureDataDirs(loadConfig()),input=await body(request);return json(await runCode(input,{enabled:config.compilerEnabled,timeoutMs:config.compileTimeoutMs,maxOutputBytes:config.maxOutputBytes,jobsDir:config.jobsDir,isolate:config.compilerIsolate,useCgroups:config.compilerUseCgroups,memoryLimitBytes:config.compilerMemoryLimitBytes,cpuQuotaPercent:config.compilerCpuQuotaPercent}))}catch(error){return handle(error)}}
