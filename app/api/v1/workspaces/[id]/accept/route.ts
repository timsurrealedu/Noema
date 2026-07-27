import {acceptInvitation} from "../../../../../../server/collaboration.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request);return json(acceptInvitation(user.id,user.email,input.token))}catch(error){return handle(error)}}
