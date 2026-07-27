import {dueCards,saveCard} from "../../../../../server/modules.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json({cards:dueCards(new URL(request.url).searchParams.get("limit")||50,undefined,user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request),result=idempotent(request,`${user.id}:${user.workspace.id}`,input,()=>saveCard(input,undefined,user.workspace.id));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
