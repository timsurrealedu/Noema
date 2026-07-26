import {discoverGoogleCalendars,selectGoogleCalendars} from "../../../../../../server/google-calendar.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{return json({calendars:await discoverGoogleCalendars(requireUser(request).id)})}catch(error){return handle(error)}}
export async function PUT(request:Request){try{const user=requireUser(request),input=await body(request);return json({calendars:selectGoogleCalendars(user.id,input.calendarIds)})}catch(error){return handle(error)}}
