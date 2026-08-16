import {availableLanguages} from "../../../../../server/compiler.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireWorkspace(request);return json({languages:availableLanguages()})}catch(error){return handle(error)}}
