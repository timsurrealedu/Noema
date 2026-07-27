import {deleteAutomation} from "../../../../../server/modules.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),version=Number(new URL(request.url).searchParams.get("version"));return json(deleteAutomation((await params).id,version,undefined,user.workspace.id))}catch(error){return handle(error)}}
