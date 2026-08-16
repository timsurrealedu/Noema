import {deleteNoteBlock,saveMarkdownBlock} from "../../../../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;blockId:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),{id,blockId}=await params;return json(saveMarkdownBlock(id,{...input,id:blockId},{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;blockId:string}>}){try{const user=requireWorkspace(request,"editor"),input=await body(request),{id,blockId}=await params;return json(deleteNoteBlock(id,blockId,input,{id:user.id,workspaceId:user.workspace.id}))}catch(error){return handle(error)}}
