import {listSessions} from "../../../../../server/auth.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireUser(request);return json({sessions:listSessions(user.id).map((session:{id:string;device:string;createdAt:string;expiresAt:string})=>({...session,current:session.id===user.session_id}))})}catch(error){return handle(error)}}
