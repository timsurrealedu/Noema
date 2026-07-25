import {searchAll} from "../../../../server/core.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);return json(searchAll(new URL(request.url).searchParams.get("q")||""))}catch(error){return handle(error)}}
