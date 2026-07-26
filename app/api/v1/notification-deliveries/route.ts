import {listDeliveries} from "../../../../server/push.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);return json({deliveries:listDeliveries()})}catch(error){return handle(error)}}
