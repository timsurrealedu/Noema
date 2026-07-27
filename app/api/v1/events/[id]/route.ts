import {deleteEvent} from "../../../../../server/core.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,{version}=await body(request);return json(deleteEvent(id,version,undefined,{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
