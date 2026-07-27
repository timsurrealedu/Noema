import {listDashboards,saveDashboard} from "../../../../server/dashboards.mjs";
import {body,handle,idempotent,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireUser(request);return json({dashboards:listDashboards(user.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request),result=idempotent(request,user.id,input,()=>saveDashboard(user.id,input));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
