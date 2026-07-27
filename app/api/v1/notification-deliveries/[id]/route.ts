import {resolveDelivery,retryDelivery} from "../../../../../server/push.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),id=(await params).id,workspaceId=user.workspace.id;return json(input.action==="retry"?retryDelivery(id,undefined,workspaceId):input.action==="resolve"?resolveDelivery(id,undefined,workspaceId):(()=>{throw new Error("Action must be retry or resolve")})())}catch(error){return handle(error)}}
