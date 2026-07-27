import {listState,saveProject} from "../../../../server/core.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json({projects:listState(undefined,user.workspace.id).projects})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request),actor={id:user.id,workspaceId:user.workspace.id},result=idempotent(request,`${user.id}:${user.workspace.id}`,input,()=>saveProject(input,undefined,actor));return json(result.value,result.replayed?200:201,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
