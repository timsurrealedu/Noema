import {getCanvas,saveCanvas} from "../../../../../server/canvas.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request);return json(getCanvas(user.workspace.id,(await params).id))}catch(error){return handle(error)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json(saveCanvas(user.id,user.workspace.id,{...input,id:(await params).id}))}catch(error){return handle(error)}}
