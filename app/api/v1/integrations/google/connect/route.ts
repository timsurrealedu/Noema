import {beginGoogleOAuth} from "../../../../../../server/google-calendar.mjs";
import {handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{return json(beginGoogleOAuth(requireUser(request).id))}catch(error){return handle(error)}}
