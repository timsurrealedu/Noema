import {completeGoogleOAuth} from "../../../../../../server/google-calendar.mjs";
import {loadConfig} from "../../../../../../server/config.mjs";
import {handle,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireUser(request),url=new URL(request.url),config=loadConfig();await completeGoogleOAuth(user.id,url.searchParams.get("state")||"",url.searchParams.get("code")||"",config);return Response.redirect(new URL("/settings?google=connected",new URL(config.googleRedirectUri).origin))}catch(error){return handle(error)}}
