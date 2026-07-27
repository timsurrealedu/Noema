import {searchWorkspace} from "../../../../server/search.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{requireUser(request);const params=new URL(request.url).searchParams;return json(await searchWorkspace(params.get("q")||"",{semantic:params.get("semantic")==="true"}))}catch(error){return handle(error)}}
