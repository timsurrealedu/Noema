import {listDeliveries} from "../../../../server/push.mjs";
import {handle,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json({deliveries:listDeliveries(undefined,user.workspace.id)})}catch(error){return handle(error)}}
