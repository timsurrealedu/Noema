import {insertTutorMessage} from "../../../../../../../server/skills.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,input=await body(request),actor={id:user.id,workspaceId:user.workspace.id},result=idempotent(request,`${user.id}:${user.workspace.id}`,{id,noteId:input.noteId,afterBlockId:input.afterBlockId||null},()=>insertTutorMessage(id,input.noteId,undefined,actor,input.afterBlockId?String(input.afterBlockId):null));return json(result.value)}catch(error){return handle(error)}}
