import {resolveCalendarConflict} from "../../../../../../server/calendar-sync.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,input=await body(request);return json(resolveCalendarConflict(user.id,id,input.choice))}catch(error){return handle(error)}}
