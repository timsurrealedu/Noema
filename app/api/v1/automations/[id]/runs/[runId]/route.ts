import {cancelAutomationRun,retryAutomationRun} from "../../../../../../../server/modules.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;runId:string}>}){try{const user=requireWorkspace(request,"editor"),{id,runId}=await params,input=await body(request);return json(input.action==="cancel"?cancelAutomationRun(id,runId,undefined,user.workspace.id):input.action==="retry"?retryAutomationRun(id,runId,undefined,user.workspace.id):(()=>{throw new Error("Action must be cancel or retry")})())}catch(error){return handle(error)}}
