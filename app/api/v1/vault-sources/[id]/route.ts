import {getVaultSource,updateVaultSource} from "../../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params;return json(getVaultSource(id,user.workspace.id))}catch(error){return handle(error)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),{id}=await params;return json(updateVaultSource(id,input,user.workspace.id))}catch(error){return handle(error)}}
