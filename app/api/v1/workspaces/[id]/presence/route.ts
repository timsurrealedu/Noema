import {listPresence,updatePresence} from "../../../../../../server/collaboration.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params;return json({presence:listPresence(user.id,id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request);return json({presence:updatePresence(user.id,id,input)})}catch(error){return handle(error)}}
