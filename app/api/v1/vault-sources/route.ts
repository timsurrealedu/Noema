import {connectVault,listVaultSources} from "../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json({sources:listVaultSources(user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json(connectVault(input,user.workspace.id),201)}catch(error){return handle(error)}}
