import {listAuditEvents} from "../../../../server/core.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{requireUser(request);const limit=Number(new URL(request.url).searchParams.get("limit"))||100;return json({events:listAuditEvents(limit)})}catch(error){return handle(error)}}
