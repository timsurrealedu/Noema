import {requestTranscription,transcriptForCapture} from "../../../../../../server/transcribe.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{const user=requireWorkspace(request,"viewer"),{id}=await params;return json({transcript:transcriptForCapture(id,user.workspace.id)})}
  catch(error){return handle(error)}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=requireWorkspace(request,"editor"),{id}=await params;
    await body(request).catch(()=>null);
    return json(requestTranscription(id,{id:user.id,workspaceId:user.workspace.id}),202);
  }catch(error){return handle(error)}
}
