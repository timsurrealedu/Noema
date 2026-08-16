import {listCanvases,saveCanvas} from "../../../../server/canvas.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json({canvases:listCanvases(user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request),result=idempotent(request,`${user.id}:${user.workspace.id}`,input,()=>saveCanvas(user.id,user.workspace.id,input));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
