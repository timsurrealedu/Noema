import {applyNoteOptimization} from "../../../../../../../server/core.mjs";
import {handle,idempotent,json,requireUser} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,result=idempotent(request,user.id,{id,apply:true},()=>applyNoteOptimization(id,undefined,user.id));return json(result.value)}catch(error){return handle(error)}}
