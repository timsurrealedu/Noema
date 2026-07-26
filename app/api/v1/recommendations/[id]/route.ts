import {decideRecommendation} from "../../../../../server/recommendations.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),input=await body(request);return json(decideRecommendation((await params).id,user.id,input.disposition,input.feedback))}catch(error){return handle(error)}}
