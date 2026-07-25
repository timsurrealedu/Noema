import {dependenciesForTask,saveTaskDependency} from "../../../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);return json({dependencies:dependenciesForTask((await params).id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request);return json(saveTaskDependency(id,input.dependsOnTaskId,undefined,user.id),201)}catch(error){return handle(error)}}
