import {cancelJob} from "../../../../../../server/jobs.mjs";
import {handle,json,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const {id}=await params;return cancelJob(id)?json({ok:true}):json({error:{code:"NOT_CANCELLABLE",message:"Job is not queued or running.",retryable:false}},409)}catch(error){return handle(error)}}
