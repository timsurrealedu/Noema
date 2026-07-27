import {applyNoteOptimization} from "../../../../../../../server/core.mjs";
import {handle,idempotent,json,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,actor={id:user.id,workspaceId:user.workspace.id},result=idempotent(request,`${user.id}:${user.workspace.id}`,{id,apply:true},()=>applyNoteOptimization(id,undefined,actor));return json(result.value)}catch(error){return handle(error)}}
