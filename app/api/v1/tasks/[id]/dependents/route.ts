import {dependentsForTask} from "../../../../../../server/core.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request);return json({dependents:dependentsForTask((await params).id,undefined,user.workspace.id)})}catch(error){return handle(error)}}
