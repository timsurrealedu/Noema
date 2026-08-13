import {eventOccurrences} from "../../../../../../server/core.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params,url=new URL(request.url),start=url.searchParams.get("start"),end=url.searchParams.get("end");if(!start||!end)throw new Error("start and end are required");return json({occurrences:eventOccurrences(id,start,end,undefined,{id:user.id,workspaceId:user.workspace.id})})}catch(error){return handle(error)}}
