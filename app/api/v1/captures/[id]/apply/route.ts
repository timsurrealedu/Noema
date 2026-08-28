import {applyCaptureInterpretation} from "../../../../../../server/core.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,input=await body(request),actor={id:user.id,workspaceId:user.workspace.id},result=idempotent(request,`${user.id}:${user.workspace.id}`,{id,...input},()=>applyCaptureInterpretation(id,undefined,actor,input));return json(result.value,200,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
