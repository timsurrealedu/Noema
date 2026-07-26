import {beginTotpEnrollment,confirmTotpEnrollment,disableTotp,mfaStatus} from "../../../../../server/auth.mjs";
import {loadConfig} from "../../../../../server/config.mjs";
import {body,handle,json,requireMfa,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireUser(request);return json(mfaStatus(user.id))}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request),key=loadConfig().appEncryptionKey;if(input.code)return json(await confirmTotpEnrollment(user.id,input.code,key,undefined,user.session_id));return json(beginTotpEnrollment(user.id,user.email,key),201)}catch(error){return handle(error)}}
export async function DELETE(request:Request){try{const user=requireMfa(request),input=await body(request);return json({disabled:await disableTotp(user.id,input.password||"",loadConfig().appEncryptionKey)})}catch(error){return handle(error)}}
