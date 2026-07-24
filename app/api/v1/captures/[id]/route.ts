import {updateCapture} from "../../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request);updateCapture(id,input.status,undefined,user.id);return json({ok:true})}catch(error){return handle(error)}}
