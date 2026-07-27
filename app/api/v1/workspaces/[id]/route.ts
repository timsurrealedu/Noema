import {workspaceDetail} from "../../../../../server/collaboration.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params;return json(workspaceDetail(user.id,id))}catch(error){return handle(error)}}
