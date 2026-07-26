import {getSettings,saveSettings} from "../../../../server/settings.mjs";
import {body,handle,idempotent,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireUser(request);return json({email:user.email,...getSettings(user.id)})}catch(error){return handle(error)}}
export async function PATCH(request:Request){try{const user=requireUser(request),input=await body(request);return json(idempotent(request,user.id,input,()=>saveSettings(user.id,input)).value)}catch(error){return handle(error)}}
