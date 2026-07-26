import {changePassword} from "../../../../../server/auth.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request);return json(await changePassword(user.id,user.session_id,input.currentPassword||"",input.newPassword||""))}catch(error){return handle(error)}}
