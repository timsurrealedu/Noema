import {retryJob} from "../../../../../../server/jobs.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor");return json(retryJob((await params).id,undefined,user.workspace.id))}catch(error){return handle(error)}}
