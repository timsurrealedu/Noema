import {listAnnotations,saveAnnotation} from "../../../../../../server/annotations.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../../../server/http.mjs";
import {getAsset} from "../../../../../../server/objects.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params;if(!getAsset(id,undefined,user.workspace.id))throw Object.assign(new Error("Asset not found"),{status:404});return json({annotations:listAnnotations(id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params,input=await body(request);if(!getAsset(id,undefined,user.workspace.id))throw Object.assign(new Error("Asset not found"),{status:404});const result=idempotent(request,user.id,input,()=>saveAnnotation(id,input,undefined,user.id));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
