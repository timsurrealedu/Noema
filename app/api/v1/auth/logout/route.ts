import {revokeSession} from "../../../../../server/auth.mjs";
import {cookie,json,sessionCookie} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export function POST(request:Request){revokeSession(cookie(request,sessionCookie));return json({ok:true},200,{"Set-Cookie":`${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`})}
