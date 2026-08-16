import {createHandwritingNote} from "../../../../server/handwriting.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request),actor={id:user.id,workspaceId:user.workspace.id},result=idempotent(request,`${user.id}:${user.workspace.id}`,input,()=>createHandwritingNote(input,actor));return json(result.value,result.replayed?200:201,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
