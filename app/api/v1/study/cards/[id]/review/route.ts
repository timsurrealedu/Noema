import {reviewCard} from "../../../../../../../server/modules.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json(reviewCard((await params).id,input.rating,undefined,user.workspace.id))}catch(error){return handle(error)}}
