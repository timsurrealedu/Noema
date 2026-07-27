import {cancelAutomationRun,retryAutomationRun} from "../../../../../../../server/modules.mjs";
import {body,handle,json,requireUser} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;runId:string}>}){try{requireUser(request);const {id,runId}=await params,input=await body(request);return json(input.action==="cancel"?cancelAutomationRun(id,runId):input.action==="retry"?retryAutomationRun(id,runId):(()=>{throw new Error("Action must be cancel or retry")})())}catch(error){return handle(error)}}
