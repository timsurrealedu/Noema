import {knowledgePath} from "../../../../../server/knowledge-graph.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request),params=new URL(request.url).searchParams,source=params.get("source")||"",target=params.get("target")||"";if(!source||!target)throw new Error("source and target are required");return json(knowledgePath(source,target,undefined,user.workspace.id))}catch(error){return handle(error)}}
