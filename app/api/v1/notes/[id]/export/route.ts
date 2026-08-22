import {exportMarkdown} from "../../../../../../server/core.mjs";
import {notePdf} from "../../../../../../server/note-pdf.mjs";
import {handle,requireWorkspace} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params;if(new URL(request.url).searchParams.get("format")==="pdf"){const result=await notePdf(id,undefined,user.workspace.id);return new Response(result.bytes,{headers:{"Cache-Control":"no-store","Content-Disposition":`attachment; filename="${result.filename}"`,"Content-Type":"application/pdf","X-Content-Type-Options":"nosniff"}})}const markdown=exportMarkdown(id,undefined,user.workspace.id);return new Response(markdown,{headers:{"Cache-Control":"no-store","Content-Disposition":"attachment; filename=note.md","Content-Type":"text/markdown; charset=utf-8"}})}catch(error){return handle(error)}}
