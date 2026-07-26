import {createReadStream,existsSync,statSync} from "node:fs";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import tar from "tar-stream";
import {getDatabase} from "../../../../server/db.mjs";
import {loadConfig} from "../../../../server/config.mjs";
import {assetPath} from "../../../../server/objects.mjs";
import {exportWorkspace} from "../../../../server/ops.mjs";
import {handle,requireMfa} from "../../../../server/http.mjs";

export const runtime="nodejs";
const safe=(name:string)=>name.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,180)||"attachment";

export async function GET(request:Request){
  try{
    requireMfa(request);const db=getDatabase(),config=loadConfig(),snapshot=exportWorkspace(db),assets=db.prepare("SELECT id,sha256,name,size FROM assets ORDER BY created_at").all() as {id:string;sha256:string;name:string;size:number}[];
    for(const asset of assets){const path=assetPath(asset.sha256,config);if(!existsSync(path)||statSync(path).size!==asset.size)throw Object.assign(new Error(`Original asset is missing or damaged: ${asset.name}`),{status:409,code:"EXPORT_INCOMPLETE"})}
    const pack=tar.pack();void (async()=>{try{pack.entry({name:"workspace.json"},JSON.stringify(snapshot,null,2));for(const asset of assets)await pipeline(createReadStream(assetPath(asset.sha256,config)),pack.entry({name:`assets/${asset.id}-${safe(asset.name)}`,size:asset.size}));pack.finalize()}catch(error){pack.destroy(error as Error)}})();
    const date=new Date().toISOString().slice(0,10);return new Response(Readable.toWeb(pack) as ReadableStream,{headers:{"Cache-Control":"no-store","Content-Disposition":`attachment; filename=lifeos-workspace-${date}.tar`,"Content-Type":"application/x-tar","X-Content-Type-Options":"nosniff"}});
  }catch(error){return handle(error)}
}
