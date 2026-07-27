import {buildRecommendations,recommendations} from "../../../../server/recommendations.mjs";
import {handle,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const url=new URL(request.url),generate=url.searchParams.get("generate")==="true",user=requireWorkspace(request,generate?"editor":"viewer"),type=url.searchParams.get("contextType")||"",id=url.searchParams.get("contextId")||"",workspaceId=user.workspace.id;return json({recommendations:generate?buildRecommendations(user.id,type,id,undefined,workspaceId):recommendations(user.id,type,id,undefined,workspaceId)})}catch(error){return handle(error)}}
