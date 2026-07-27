import {decideRecommendation} from "../../../../../server/recommendations.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json(decideRecommendation((await params).id,user.id,input.disposition,input.feedback,undefined,user.workspace.id))}catch(error){return handle(error)}}
