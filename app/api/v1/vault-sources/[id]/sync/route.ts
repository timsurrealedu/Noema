import {scanVault} from "../../../../../../server/vault.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params;return json(scanVault(id,{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
