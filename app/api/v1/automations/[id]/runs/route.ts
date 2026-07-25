import {automationMetrics,automationRuns,executeAutomation} from "../../../../../../server/modules.mjs";
import {handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const {id}=await params;return json({runs:automationRuns(id),metrics:automationMetrics(id)})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);return json(executeAutomation((await params).id),201)}catch(error){return handle(error)}}
