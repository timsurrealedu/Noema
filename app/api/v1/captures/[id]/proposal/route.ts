import {updateCaptureProposal} from "../../../../../../server/core.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,input=await body(request),actor={id:user.id,workspaceId:user.workspace.id};return json(updateCaptureProposal(id,input,undefined,actor))}catch(error){return handle(error)}}
