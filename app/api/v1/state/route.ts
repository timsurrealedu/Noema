import {listState} from "../../../../server/core.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);return json(listState())}catch(error){return handle(error)}}
