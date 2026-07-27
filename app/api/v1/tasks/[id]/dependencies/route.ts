import {dependenciesForTask,saveTaskDependency} from "../../../../../../server/core.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request);return json({dependencies:dependenciesForTask((await params).id,undefined,user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,input=await body(request);return json(saveTaskDependency(id,input.dependsOnTaskId,undefined,{id:user.id,workspaceId:user.workspace.id}),201)}catch(error){return handle(error)}}
