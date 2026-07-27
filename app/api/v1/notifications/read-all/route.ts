import {readAllNotifications} from "../../../../../server/modules.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function POST(request:Request){try{const user=requireWorkspace(request,"editor");return json(readAllNotifications(undefined,user.workspace.id))}catch(error){return handle(error)}}
