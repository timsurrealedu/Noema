import {buildRecommendations,recommendations} from "../../../../server/recommendations.mjs";
import {handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireUser(request),url=new URL(request.url),type=url.searchParams.get("contextType")||"",id=url.searchParams.get("contextId")||"",generate=url.searchParams.get("generate")==="true";return json({recommendations:generate?buildRecommendations(user.id,type,id):recommendations(user.id,type,id)})}catch(error){return handle(error)}}
