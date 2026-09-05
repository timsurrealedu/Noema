import {getDatabase} from "../../../../../../server/db.mjs";
import {handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
import {strokesToSvg} from "../../../../../../server/vault.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=requireWorkspace(request,"viewer"),{id}=await params;
    const ink=getDatabase().prepare("SELECT i.width,i.height,i.strokes_json FROM note_ink_blocks i JOIN note_blocks b ON b.id=i.block_id JOIN notes n ON n.id=b.note_id WHERE i.block_id=? AND n.workspace_id=?").get(id,user.workspace.id) as {width:number;height:number;strokes_json:string}|undefined;
    if(!ink)return json({error:{message:"Handwriting not found"}},404);
    return new Response(strokesToSvg({...ink,strokes:JSON.parse(ink.strokes_json)}),{headers:{"Content-Type":"image/svg+xml","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){return handle(error)}
}
