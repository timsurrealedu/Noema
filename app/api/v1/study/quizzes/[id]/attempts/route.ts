import {submitQuiz} from "../../../../../../../server/modules.mjs";
import {body,handle,json,requireUser} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const input=await body(request);return json(submitQuiz((await params).id,input.answers),201)}catch(error){return handle(error)}}
