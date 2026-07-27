import {linkProject,unlinkProject} from "../../../../server/projects.mjs";
import {body,handle,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor");return json(linkProject(await body(request),undefined,{id:user.id,workspaceId:user.workspace.id}),201)}catch(error){return handle(error)}}
export async function DELETE(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json(unlinkProject(input.projectId,input.objectType,input.objectId,undefined,{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
