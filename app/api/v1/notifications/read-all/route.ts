import {readAllNotifications} from "../../../../../server/modules.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function POST(request:Request){try{requireUser(request);return json(readAllNotifications())}catch(error){return handle(error)}}
