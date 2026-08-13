import {mutateEventOccurrence} from "../../../../../../../server/core.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;originalStartAt:string}>}){try{const user=requireWorkspace(request,"editor"),{id,originalStartAt}=await params;return json(mutateEventOccurrence(id,decodeURIComponent(originalStartAt),await body(request),undefined,{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
