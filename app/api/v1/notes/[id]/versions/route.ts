import {noteVersions,restoreNoteVersion} from "../../../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);return json({versions:noteVersions((await params).id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request);return json(restoreNoteVersion(id,input.version,undefined,user.id))}catch(error){return handle(error)}}
