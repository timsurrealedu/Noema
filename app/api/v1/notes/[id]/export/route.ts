import {exportMarkdown} from "../../../../../../server/core.mjs";
import {handle,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),markdown=exportMarkdown((await params).id,undefined,user.workspace.id);return new Response(markdown,{headers:{"Cache-Control":"no-store","Content-Disposition":"attachment; filename=note.md","Content-Type":"text/markdown; charset=utf-8"}})}catch(error){return handle(error)}}
