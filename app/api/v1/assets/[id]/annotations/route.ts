import {listAnnotations,saveAnnotation} from "../../../../../../server/annotations.mjs";
import {body,handle,idempotent,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);return json({annotations:listAnnotations((await params).id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request),result=idempotent(request,user.id,input,()=>saveAnnotation(id,input,undefined,user.id));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
