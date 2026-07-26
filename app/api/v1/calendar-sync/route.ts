import {calendarSyncStatus,pullGoogleCalendar,pushGoogleCalendar} from "../../../../server/calendar-sync.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{return json(calendarSyncStatus(requireUser(request).id))}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request),pushed=await pushGoogleCalendar(user.id),pulled=await pullGoogleCalendar(user.id);return json({result:{pushed,pulled},...calendarSyncStatus(user.id)})}catch(error){return handle(error)}}
