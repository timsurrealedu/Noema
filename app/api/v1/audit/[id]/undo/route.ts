import {undoAuditEvent} from "../../../../../../server/core.mjs";
import {handle,idempotent,json,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,result=idempotent(request,user.id,{id,undo:true},()=>undoAuditEvent(id,undefined,user.id));return json(result.value,200,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
