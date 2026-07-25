import {readNotification} from "../../../../../../server/modules.mjs";
import {handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);return json(readNotification((await params).id))}catch(error){return handle(error)}}
