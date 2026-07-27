import {deleteProject,saveProject} from "../../../../../server/core.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
import {projectWorkspace} from "../../../../../server/projects.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request);return json(projectWorkspace((await params).id,undefined,user.workspace.id))}catch(error){return handle(error)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,input=await body(request);return json(saveProject({...input,id},undefined,{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params;return json(deleteProject(id,undefined,{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
