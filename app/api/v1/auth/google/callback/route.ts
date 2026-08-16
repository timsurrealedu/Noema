import {loadConfig} from "../../../../../../server/config.mjs";
import {completeGoogleSignIn} from "../../../../../../server/google-sign-in.mjs";
import {handle,sessionCookie} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{const url=new URL(request.url),config=loadConfig();if(!config.ownerEmail)throw new Error("NOEMA_OWNER_EMAIL is required");const result=await completeGoogleSignIn(url.searchParams.get("state")||"",url.searchParams.get("code")||"",request.headers.get("user-agent")||"",config),origin=new URL(config.googleLoginRedirectUri).origin,secure=origin.startsWith("https:")?"; Secure":"";return new Response(null,{status:302,headers:{Location:new URL("/",origin).toString(),"Set-Cookie":`${sessionCookie}=${result.token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${config.sessionHours*3600}`}})}catch(error){return handle(error)}}
