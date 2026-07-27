import {previewAutomation} from "../../../../../server/modules.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{requireUser(request);return json(previewAutomation(await body(request)))}catch(error){return handle(error)}}
