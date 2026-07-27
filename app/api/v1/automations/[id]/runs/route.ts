import {automationMetrics,automationRuns,executeAutomation} from "../../../../../../server/modules.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params;return json({runs:automationRuns(id,undefined,user.workspace.id),metrics:automationMetrics(id,undefined,user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor");return json(executeAutomation((await params).id,undefined,{},false,user.workspace.id),201)}catch(error){return handle(error)}}
