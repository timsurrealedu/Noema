import {listState} from "../../../../server/core.mjs";
import {handle,json,requireWorkspace} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json(listState(undefined,user.workspace.id))}catch(error){return handle(error)}}
