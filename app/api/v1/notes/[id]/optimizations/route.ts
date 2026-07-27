import {noteOptimizations,requestNoteOptimization} from "../../../../../../server/core.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request);return json({optimizations:noteOptimizations((await params).id,undefined,user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json(requestNoteOptimization((await params).id,input.mode,undefined,user.workspace.id),202)}catch(error){return handle(error)}}
