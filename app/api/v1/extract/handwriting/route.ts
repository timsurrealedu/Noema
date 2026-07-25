import {getAsset} from "../../../../../server/objects.mjs";
import {extractHandwriting} from "../../../../../server/extract.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";
import {ensureDataDirs,loadConfig} from "../../../../../server/config.mjs";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    requireUser(request);
    const config=ensureDataDirs(loadConfig());
    const {assetId}=await body(request);
    if(typeof assetId!=="string"||!assetId)throw Object.assign(new Error("assetId is required"),{status:400});
    const asset=getAsset(assetId);
    if(!asset)throw Object.assign(new Error("Asset not found"),{status:404});
    return json(await extractHandwriting(asset,config));
  }catch(error){return handle(error)}
}
