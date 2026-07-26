import {deleteEvent} from "../../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,{version}=await body(request);return json(deleteEvent(id,version,undefined,user.id))}catch(error){return handle(error)}}
