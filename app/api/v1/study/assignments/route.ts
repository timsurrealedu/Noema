import {listAssignments,saveAssignment} from "../../../../../server/modules.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json({assignments:listAssignments(new URL(request.url).searchParams.get("courseId"),undefined,user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request),result=idempotent(request,`${user.id}:${user.workspace.id}`,input,()=>saveAssignment(input,undefined,user.workspace.id));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
