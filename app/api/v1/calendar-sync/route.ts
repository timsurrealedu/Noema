import {calendarSyncStatus,pullGoogleCalendar,pushGoogleCalendar} from "../../../../server/calendar-sync.mjs";
import {handle,json,requireUser,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request){try{return json(calendarSyncStatus(requireUser(request).id))}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request),pushed=await pushGoogleCalendar(user.id),pulled=await pullGoogleCalendar(user);return json({result:{pushed,pulled},...calendarSyncStatus(user.id)})}catch(error){return handle(error)}}
