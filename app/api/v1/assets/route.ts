import {handle,json,requireWorkspace} from "../../../../server/http.mjs";
import {storeAsset} from "../../../../server/objects.mjs";
import {convertDocxToPdf} from "../../../../server/docx.mjs";
import {Readable} from "node:stream";

export const runtime="nodejs";
const DOCX="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export async function POST(request:Request){
  try{
    const user=requireWorkspace(request,"editor");
    const form=await request.formData(),files=form.getAll("file").filter((value):value is File=>value instanceof File);
    if(!files.length)return json({error:{code:"NO_FILE",message:"Attach at least one file under the \"file\" field.",retryable:false}},400);
    if(files.length>10)return json({error:{code:"TOO_MANY_FILES",message:"Upload at most 10 files at once.",retryable:false}},400);
    const assets=[];
    for(const file of files){
      const asset=await storeAsset({stream:file.stream(),name:file.name,mime:file.type||"application/octet-stream"},undefined,undefined,user.workspace.id);
      assets.push(asset);
      if(asset.mime===DOCX){
        try{
          const bytes=Buffer.from(await file.arrayBuffer());
          const pdfBytes=await convertDocxToPdf(bytes);
          if(pdfBytes){
            const derived=await storeAsset({stream:Readable.from(pdfBytes),name:`${file.name.replace(/\.docx$/i,"")}.pdf`,mime:"application/pdf"},undefined,undefined,user.workspace.id);
            assets.push({...derived,derivedFrom:asset.id});
          }
        }catch{/* graceful skip: DOCX remains usable without a PDF twin */}
      }
    }
    return json({assets:assets.map(({sha256,name,mime,size,kind,deduplicated,id,derivedFrom}:any)=>({id,sha256,name,mime,size,kind,deduplicated,derivedFrom}))},201);
  }catch(error){return handle(error)}
}
