import {applyCaptureInterpretation} from "../../../../../../server/core.mjs";
import {handle,idempotent,json,requireUser} from "../../../../../../server/http.mjs";
import {getJob} from "../../../../../../server/jobs.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,job=getJob(id);if(!job)return json({error:{code:"NOT_FOUND",message:"Job not found",retryable:false}},404);if(job.kind!=="interpret-capture"||job.state!=="completed")return json({error:{code:"NOT_APPROVABLE",message:"Only completed interpretation jobs can be approved.",retryable:false}},409);const result=idempotent(request,user.id,{id,approve:true},()=>applyCaptureInterpretation(job.input.captureId,undefined,user.id));return json(result.value,200,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
