import {updateCapture} from "../../../../../server/core.mjs";
import {body,handle,idempotent,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request),result=idempotent(request,user.id,{id,...input},()=>updateCapture(id,input.status,input.version,undefined,user.id));return json(result.value,200,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
