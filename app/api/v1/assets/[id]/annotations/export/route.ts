import {exportAnnotations} from "../../../../../../../server/annotations.mjs";
import {handle,requireUser} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const data=exportAnnotations((await params).id);return Response.json(data,{headers:{"Content-Disposition":`attachment; filename="${data.asset.name}.annotations.json"`,"Cache-Control":"no-store"}})}catch(error){return handle(error)}}
