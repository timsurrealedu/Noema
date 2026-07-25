import {createNotification,listNotifications} from "../../../../server/modules.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);return json({notifications:listNotifications()})}catch(error){return handle(error)}}
export async function POST(request:Request){try{requireUser(request);return json(createNotification(await body(request)),201)}catch(error){return handle(error)}}
