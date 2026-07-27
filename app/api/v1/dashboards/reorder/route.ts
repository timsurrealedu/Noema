import {reorderDashboards} from "../../../../../server/dashboards.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request);return json({dashboards:reorderDashboards(user.id,input.ids)})}catch(error){return handle(error)}}
