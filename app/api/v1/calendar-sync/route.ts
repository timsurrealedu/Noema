import {calendarSyncStatus,pullGoogleCalendar} from "../../../../server/calendar-sync.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{return json(calendarSyncStatus(requireUser(request).id))}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request);return json({result:await pullGoogleCalendar(user.id),...calendarSyncStatus(user.id)})}catch(error){return handle(error)}}
