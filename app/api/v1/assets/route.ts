import {handle,json,requireUser} from "../../../../server/http.mjs";
import {storeAsset} from "../../../../server/objects.mjs";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    requireUser(request);
    const form=await request.formData(),files=form.getAll("file").filter((value):value is File=>value instanceof File);
    if(!files.length)return json({error:{code:"NO_FILE",message:"Attach at least one file under the \"file\" field.",retryable:false}},400);
    if(files.length>10)return json({error:{code:"TOO_MANY_FILES",message:"Upload at most 10 files at once.",retryable:false}},400);
    const assets=[];
    for(const file of files)assets.push(await storeAsset({stream:file.stream(),name:file.name,mime:file.type||"application/octet-stream"}));
    return json({assets:assets.map(asset=>({id:asset.id,sha256:asset.sha256,name:asset.name,mime:asset.mime,size:asset.size,kind:asset.kind,deduplicated:asset.deduplicated}))},201);
  }catch(error){return handle(error)}
}
