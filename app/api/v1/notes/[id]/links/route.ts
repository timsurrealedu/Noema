import {linksForNote} from "../../../../../../server/core.mjs";
import {handle,json,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);return json({links:linksForNote((await params).id)})}catch(error){return handle(error)}}
