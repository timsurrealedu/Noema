import {createInvitation} from "../../../../../../server/collaboration.mjs";
import {body,handle,json,requireMfa} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params,input=await body(request);return json(createInvitation(user.id,id,input),201)}catch(error){return handle(error)}}
