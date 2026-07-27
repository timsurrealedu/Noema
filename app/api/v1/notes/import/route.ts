import {importMarkdown} from "../../../../../server/core.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),markdown=await request.text();return json(importMarkdown(markdown,undefined,{id:user.id,workspaceId:user.workspace.id}),201)}catch(error){return handle(error)}}
