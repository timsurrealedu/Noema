import {reorderDashboards} from "../../../../../server/dashboards.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json({dashboards:reorderDashboards(user.workspace.id,input.ids)})}catch(error){return handle(error)}}
