import {deleteProject,saveProject} from "../../../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request);return json(saveProject({...input,id},undefined,user.id))}catch(error){return handle(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params;return json(deleteProject(id,undefined,user.id))}catch(error){return handle(error)}}
