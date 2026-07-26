import {ensureDataDirs,loadConfig} from "../../../../../server/config.mjs";
import {runCode} from "../../../../../server/compiler.mjs";
import {consumeApproval} from "../../../../../server/approvals.mjs";
import {body,handle,json,requireMfa} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireMfa(request),config=ensureDataDirs(loadConfig()),input=await body(request);consumeApproval(input.approvalId,user,"compiler.run",{language:input.language,code:input.code});return json(await runCode(input,{enabled:config.compilerEnabled,timeoutMs:config.compileTimeoutMs,maxOutputBytes:config.maxOutputBytes,jobsDir:config.jobsDir,isolate:config.compilerIsolate,useCgroups:config.compilerUseCgroups,memoryLimitBytes:config.compilerMemoryLimitBytes,cpuQuotaPercent:config.compilerCpuQuotaPercent,repoDir:config.codeDir}))}catch(error){return handle(error)}}
