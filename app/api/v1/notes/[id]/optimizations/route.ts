import {noteOptimizations,requestNoteOptimization} from "../../../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);return json({optimizations:noteOptimizations((await params).id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const input=await body(request);return json(requestNoteOptimization((await params).id,input.mode),202)}catch(error){return handle(error)}}
