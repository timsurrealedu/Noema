import {cancelJob} from "../../../../../../server/jobs.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params;return cancelJob(id,undefined,user.workspace.id)?json({ok:true}):json({error:{code:"NOT_CANCELLABLE",message:"Job is not queued or running.",retryable:false}},409)}catch(error){return handle(error)}}
