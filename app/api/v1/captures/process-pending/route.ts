import {processPendingHandwriting} from "../../../../../server/handwriting.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function POST(request:Request){try{const user=requireWorkspace(request,"editor");return json(processPendingHandwriting(user.workspace.id),202)}catch(error){return handle(error)}}
