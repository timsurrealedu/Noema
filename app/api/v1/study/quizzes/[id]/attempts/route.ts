import {submitQuiz} from "../../../../../../../server/modules.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request);return json(submitQuiz((await params).id,input.answers,undefined,user.workspace.id),201)}catch(error){return handle(error)}}
