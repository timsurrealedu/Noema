import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
import {enqueueJob} from "../../../../../../server/jobs.mjs";
import {getSkill} from "../../../../../../server/skills.mjs";

export async function POST(request:Request,{params}:{params:Promise<{name:string}>}){try{const user=requireWorkspace(request,"editor"),{name}=await params;getSkill(name);return json({jobId:enqueueJob("skill-run",{skill:name,input:await body(request)},undefined,user.workspace.id)},202)}catch(error){return handle(error)}}
