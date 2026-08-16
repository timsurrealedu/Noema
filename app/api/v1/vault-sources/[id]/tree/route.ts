import {listVaultFolders,vaultTree} from "../../../../../../server/vault.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params;return json({tree:vaultTree(id,user.workspace.id),folders:listVaultFolders(id,user.workspace.id)})}catch(error){return handle(error)}}
