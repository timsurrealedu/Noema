import {createReadStream,existsSync} from "node:fs";
import {Readable} from "node:stream";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
import {assetPath,getAsset} from "../../../../../server/objects.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=requireWorkspace(request);
    const {id}=await params,asset=getAsset(id,undefined,user.workspace.id);
    if(!asset)return json({error:{code:"NOT_FOUND",message:"Asset not found",retryable:false}},404);
    const path=assetPath(asset.sha256);
    if(!existsSync(path))return json({error:{code:"OBJECT_MISSING",message:"Stored object is missing from disk.",retryable:false}},500);
    const download=new URL(request.url).searchParams.has("download");
    return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream,{headers:{
      "Content-Type":asset.mime,"Content-Length":String(asset.size),"Cache-Control":"private, immutable, max-age=31536000",
      "Content-Disposition":`${download?"attachment":"inline"}; filename="${encodeURIComponent(asset.name)}"`,
    }});
  }catch(error){return handle(error)}
}
