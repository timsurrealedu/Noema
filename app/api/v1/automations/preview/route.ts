import {previewAutomation} from "../../../../../server/modules.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{requireWorkspace(request,"editor");return json(previewAutomation(await body(request)))}catch(error){return handle(error)}}
