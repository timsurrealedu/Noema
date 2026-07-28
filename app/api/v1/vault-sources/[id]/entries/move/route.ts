import {moveVaultEntry,previewVaultMove} from "../../../../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),{id}=await params,actor={id:user.id,workspaceId:user.workspace.id};return json(input.preview?previewVaultMove(id,input,user.workspace.id):moveVaultEntry(id,input,actor))}catch(error){return handle(error)}}
