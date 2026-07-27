import {listComments,saveComment} from "../../../../../../server/collaboration.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,query=new URL(request.url).searchParams;return json({comments:listComments(user.id,id,query.get("objectType"),query.get("objectId"))})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request);return json(saveComment(user.id,id,input),201)}catch(error){return handle(error)}}
