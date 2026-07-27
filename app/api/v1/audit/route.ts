import {listAuditEvents} from "../../../../server/core.mjs";
import {handle,json,requireWorkspace} from "../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireWorkspace(request);const limit=Number(new URL(request.url).searchParams.get("limit"))||100;return json({events:listAuditEvents(limit,undefined,user.workspace.id)})}catch(error){return handle(error)}}
