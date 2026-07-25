import {saveQuiz} from "../../../../../server/modules.mjs";
import {body,handle,idempotent,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request),result=idempotent(request,user.id,input,()=>saveQuiz(input));return json(result.value,result.replayed?200:201)}catch(error){return handle(error)}}
