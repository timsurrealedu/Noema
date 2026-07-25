import {savePushSubscription} from "../../../../server/modules.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{requireUser(request);return json(savePushSubscription(await body(request)),201)}catch(error){return handle(error)}}
