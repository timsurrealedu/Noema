import {listAutomations,saveAutomation} from "../../../../server/modules.mjs";
import {body,handle,idempotent,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);return json({automations:listAutomations()})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request),result=idempotent(request,user.id,input,()=>saveAutomation(input));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
