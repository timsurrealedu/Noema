import {getJob} from "../../../../../server/jobs.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params,job=getJob(id,undefined,user.workspace.id);if(!job)return json({error:{code:"NOT_FOUND",message:"Job not found",retryable:false}},404);const {input,input_json,...safe}=job,summary=job.result&&{provider:job.result.provider,model:job.result.model,durationMs:job.result.durationMs,truncated:!!job.result.truncated,captureVersion:job.result.captureVersion,actions:job.result.actions,summary:job.result.summary,clarifications:job.result.clarifications};return json({...safe,result:summary})}catch(error){return handle(error)}}
