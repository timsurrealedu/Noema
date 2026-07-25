import {exportMarkdown} from "../../../../../../server/core.mjs";
import {handle,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const markdown=exportMarkdown((await params).id);return new Response(markdown,{headers:{"Cache-Control":"no-store","Content-Disposition":"attachment; filename=note.md","Content-Type":"text/markdown; charset=utf-8"}})}catch(error){return handle(error)}}
