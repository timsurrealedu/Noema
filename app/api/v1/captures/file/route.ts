import {createFileCapture} from "../../../../../server/core.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const user=requireWorkspace(request,"editor");
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File))return json({error:{code:"NO_FILE",message:"Attach one file under the \"file\" field.",retryable:false}},400);
    const capture=await createFileCapture(file,undefined,{id:user.id,workspaceId:user.workspace.id});
    return json(capture,201);
  }catch(error){return handle(error)}
}
