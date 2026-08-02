import {googleStatus,listGoogleCalendars,revokeGoogle} from "../../../../../server/google-calendar.mjs";
import {loadConfig} from "../../../../../server/config.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireUser(request),status=googleStatus(user.id),config=loadConfig(),configured=!!(config.googleClientId&&config.googleClientSecret&&config.googleRedirectUri);return json({...status,configured,calendars:status.connected?listGoogleCalendars(user.id):[]})}catch(error){return handle(error)}}
export async function DELETE(request:Request){try{return json(await revokeGoogle(requireUser(request).id))}catch(error){return handle(error)}}
