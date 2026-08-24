import {listMathContinuations,requestMathContinuation,resolveMathContinuation} from "../../../../../../server/math.mjs";
import {insertMarkdownBlockAfter} from "../../../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{const user=requireWorkspace(request,"editor"),{id}=await params;return json({continuations:listMathContinuations(id,user.workspace.id)})}
  catch(error){return handle(error)}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=requireWorkspace(request,"editor"),input=await body(request),{id}=await params;
    if(input.continuationId){
      const accept=input.action==="accept";
      const resolved=resolveMathContinuation(String(input.continuationId),accept?"accept":"dismiss",user.workspace.id,undefined,accept?(row:any,db:any)=>{insertMarkdownBlockAfter(row.note_id,row.block_id,row.continuation,{id:user.id,workspaceId:user.workspace.id},db)}:undefined);
      return json(resolved);
    }
    return json(requestMathContinuation(id,input,{id:user.id,workspaceId:user.workspace.id}),202);
  }catch(error){return handle(error)}
}
