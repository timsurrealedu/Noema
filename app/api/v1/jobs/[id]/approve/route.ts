import {applyCaptureInterpretation} from "../../../../../../server/core.mjs";
import {handle,idempotent,json,requireMfa,requireWorkspace} from "../../../../../../server/http.mjs";
import {getJob} from "../../../../../../server/jobs.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),context=requireWorkspace(request,"editor"),workspaceId=context.workspace.id,{id}=await params,job=getJob(id,undefined,workspaceId);if(!job)return json({error:{code:"NOT_FOUND",message:"Job not found",retryable:false}},404);if(job.kind!=="interpret-capture"||job.state!=="completed")return json({error:{code:"NOT_APPROVABLE",message:"Only completed interpretation jobs can be approved.",retryable:false}},409);const actor={id:user.id,workspaceId},result=idempotent(request,`${user.id}:${workspaceId}`,{id,approve:true},()=>applyCaptureInterpretation(job.input.captureId,undefined,actor));return json(result.value,200,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
