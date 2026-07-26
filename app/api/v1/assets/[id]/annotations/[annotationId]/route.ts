import {deleteAnnotation,saveAnnotation} from "../../../../../../../server/annotations.mjs";
import {body,handle,json,requireUser} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;annotationId:string}>}){try{const user=requireUser(request),paramsValue=await params,input=await body(request);return json(saveAnnotation(paramsValue.id,{...input,id:paramsValue.annotationId},undefined,user.id))}catch(error){return handle(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;annotationId:string}>}){try{const user=requireUser(request),value=await params;return json(deleteAnnotation(value.annotationId,value.id,undefined,user.id))}catch(error){return handle(error)}}
