import {revokeSession} from "../../../../../server/auth.mjs";
import {cookie,handle,json,requireSameOrigin,sessionCookie} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export function POST(request:Request){try{requireSameOrigin(request);revokeSession(cookie(request,sessionCookie));return json({ok:true},200,{"Set-Cookie":`${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`})}catch(error){return handle(error)}}
