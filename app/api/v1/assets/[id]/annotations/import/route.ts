import {importAnnotationsSidecar} from "../../../../../../../server/annotations.mjs";
import {body,handle,json,requireUser} from "../../../../../../../server/http.mjs";

export const runtime="nodejs";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=requireUser(request),{id}=await params,input=await body(request);
    return json(importAnnotationsSidecar(id,input,undefined,user.id));
  }catch(error){return handle(error)}
}
