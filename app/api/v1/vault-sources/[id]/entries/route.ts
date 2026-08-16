import {createVaultNote} from "../../../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),{id}=await params;return json(createVaultNote(id,input,{id:user.id,workspaceId:user.workspace.id}),201)}catch(error){return handle(error)}}
