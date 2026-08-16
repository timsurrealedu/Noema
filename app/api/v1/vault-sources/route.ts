import {connectVault,listVaultSources,vaultTree} from "../../../../server/vault.mjs";
import {prepareVaultActivation} from "../../../../server/vault-gate.mjs";
import {body,handle,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request),sources=listVaultSources(user.workspace.id),params=new URL(request.url).searchParams;if(params.get("tree")!=="true")return json({sources});const requested=params.get("sourceId"),selected=sources.find((source:{id:string})=>source.id===requested)||sources[0];return json({sources,selectedSourceId:selected?.id||"",tree:selected?vaultTree(selected.id,user.workspace.id):null})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request);prepareVaultActivation(input.rootPath);return json(connectVault(input,user.workspace.id),201)}catch(error){return handle(error)}}
