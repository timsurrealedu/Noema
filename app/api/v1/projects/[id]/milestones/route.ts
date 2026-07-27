import {saveMilestone} from "../../../../../../server/projects.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor");return json(saveMilestone((await params).id,await body(request),undefined,{id:user.id,workspaceId:user.workspace.id}),201)}catch(error){return handle(error)}}
