import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";
import {runTutorParallel} from "../../../../../server/skills.mjs";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const user=requireWorkspace(request,"editor"),input=await body(request);
    if(!String(input.question||"").trim())throw new Error("Question is required");
    return json(await runTutorParallel(input,undefined,undefined,user.workspace.id));
  }catch(error){return handle(error)}
}
