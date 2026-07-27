import {registerWithInvitation} from "../../../../../server/collaboration.mjs";
import {body,handle,json,requireSameOrigin} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{requireSameOrigin(request);return json(await registerWithInvitation(await body(request)),201)}catch(error){return handle(error)}}
