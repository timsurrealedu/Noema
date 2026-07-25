import {listState,saveProject} from "../../../../../server/core.mjs";
import {body,handle,idempotent,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);return json({projects:listState().projects})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request),result=idempotent(request,user.id,input,()=>saveProject(input,undefined,user.id));return json(result.value,result.replayed?200:201,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
