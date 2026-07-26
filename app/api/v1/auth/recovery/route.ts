import {regenerateRecoveryCodes} from "../../../../../server/auth.mjs";
import {handle,json,requireMfa} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireMfa(request);return json(await regenerateRecoveryCodes(user.id))}catch(error){return handle(error)}}
