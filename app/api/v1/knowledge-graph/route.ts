import {queryKnowledgeGraph} from "../../../../server/knowledge-graph.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);const params=new URL(request.url).searchParams;return json(queryKnowledgeGraph({root:params.get("root")||"",depth:Number(params.get("depth")||2),types:(params.get("types")||"").split(",").filter(Boolean),limit:Number(params.get("limit")||300)}))}catch(error){return handle(error)}}
