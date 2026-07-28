import {listNoteBlocks,reorderNoteBlocks,saveMarkdownBlock} from "../../../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"viewer"),{id}=await params;return json({blocks:listNoteBlocks(id,{id:user.id,workspaceId:user.workspace.id})})}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),{id}=await params;return json(saveMarkdownBlock(id,input,{id:user.id,workspaceId:user.workspace.id}),201)}catch(error){return handle(error)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),{id}=await params;return json({blocks:reorderNoteBlocks(id,input,{id:user.id,workspaceId:user.workspace.id})})}catch(error){return handle(error)}}
