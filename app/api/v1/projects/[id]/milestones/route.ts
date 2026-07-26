import {saveMilestone} from "../../../../../../server/projects.mjs";
import {body,handle,json,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request);return json(saveMilestone((await params).id,await body(request),undefined,user.id),201)}catch(error){return handle(error)}}
