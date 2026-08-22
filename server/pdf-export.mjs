import {readFile} from "node:fs/promises";
import {PDFDocument,rgb} from "pdf-lib";
import {assetPath} from "./objects.mjs";
import {listAnnotations} from "./annotations.mjs";

const color=(value="#f5d90a")=>{const hex=value.replace("#","");return rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255)};
const safeName=value=>String(value||"document").replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"")||"document";

export async function flattenedPdf(asset,config){
  const pdf=await PDFDocument.load(await readFile(assetPath(asset.sha256,config))),annotations=listAnnotations(asset.id);
  for(const annotation of annotations){const page=pdf.getPage(annotation.page-1);if(!page)continue;const {width,height}=page.getSize(),g=annotation.geometry,c=color(annotation.color);
    if(annotation.kind==="highlight")page.drawRectangle({x:g.x*width,y:height-(g.y+g.height)*height,width:g.width*width,height:g.height*height,color:c,opacity:.35});
    if(annotation.kind==="text")page.drawText(annotation.content||"Note",{x:g.x*width,y:height-(g.y+g.height)*height,size:12,color:c});
    if(annotation.kind==="ink"){const points=g.points||[];for(let i=1;i<points.length;i++)page.drawLine({start:{x:points[i-1][0]*width,y:height-points[i-1][1]*height},end:{x:points[i][0]*width,y:height-points[i][1]*height},color:c,thickness:2})}
  }
  return {bytes:await pdf.save(),filename:`${safeName(asset.name.replace(/\.pdf$/i,""))}-annotated-${new Date().toISOString().slice(0,10)}.pdf`};
}
