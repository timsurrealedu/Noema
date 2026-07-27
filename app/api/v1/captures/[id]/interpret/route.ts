import {enqueueJob} from "../../../../../../server/jobs.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
import {getDatabase} from "../../../../../../server/db.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),{id}=await params,db=getDatabase(),workspaceId=user.workspace.id;if(!db.prepare("SELECT id FROM captures WHERE id=? AND workspace_id=?").get(id,workspaceId))throw Object.assign(new Error("Capture not found"),{status:404});return json({jobId:enqueueJob("interpret-capture",{captureId:id},db,workspaceId)},202)}catch(error){return handle(error)}}
