import {searchWorkspace} from "../../../../server/search.mjs";
import {handle,json,requireWorkspace} from "../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireWorkspace(request),params=new URL(request.url).searchParams;return json(await searchWorkspace(params.get("q")||"",{semantic:params.get("semantic")==="true",workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
