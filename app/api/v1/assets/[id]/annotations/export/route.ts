import {exportAnnotations} from "../../../../../../../server/annotations.mjs";
import {flattenedPdf} from "../../../../../../../server/pdf-export.mjs";
import {loadConfig} from "../../../../../../../server/config.mjs";
import {getAsset} from "../../../../../../../server/objects.mjs";
import {handle,requireWorkspace} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params,asset=getAsset(id,undefined,user.workspace.id);if(!asset||asset.mime!=="application/pdf")throw Object.assign(new Error("PDF asset not found"),{status:404});if(new URL(request.url).searchParams.get("format")==="json"){const data=exportAnnotations(id);return Response.json(data,{headers:{"Content-Disposition":`attachment; filename="${data.asset.name}.annotations.json"`,"Cache-Control":"no-store"}})}const result=await flattenedPdf(asset,loadConfig());return new Response(result.bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${result.filename}"`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}catch(error){return handle(error)}}
