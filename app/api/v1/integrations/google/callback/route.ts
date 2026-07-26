import {completeGoogleOAuth} from "../../../../../../server/google-calendar.mjs";
import {handle,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireUser(request),url=new URL(request.url);await completeGoogleOAuth(user.id,url.searchParams.get("state")||"",url.searchParams.get("code")||"");return Response.redirect(new URL("/settings?google=connected",url.origin))}catch(error){return handle(error)}}
