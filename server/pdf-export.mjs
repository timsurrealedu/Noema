import {readFile} from "node:fs/promises";
import {PDFDocument,rgb} from "pdf-lib";
import {getDatabase} from "./db.mjs";
import {assetPath} from "./objects.mjs";
import {listAnnotations} from "./annotations.mjs";
import {DEFAULT_COLOR,HIGHLIGHT_OPACITY,INK_THICKNESS,TEXT_MAX_SIZE,TEXT_MIN_SIZE} from "./pdf-style.mjs";

const color=(value=DEFAULT_COLOR)=>{const hex=String(value||DEFAULT_COLOR).replace("#","");return rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255)};
const safeName=value=>String(value||"document").replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"")||"document";

/** Midpoint smoothing: subdivide each segment through its midpoints so strokes
 *  match the rounded polyline preview in the annotator. */
function smoothInk(points){
  const smoothed=[];
  for(let i=0;i<points.length;i++){
    if(i===0)smoothed.push(points[0]);
    else{
      const previous=points[i-1],current=points[i];
      smoothed.push({x:(previous.x+current.x)/2,y:(previous.y+current.y)/2},{x:current.x,y:current.y});
    }
  }
  return smoothed;
}

export async function flattenedPdf(asset,config,db=getDatabase()){
  const pdf=await PDFDocument.load(await readFile(assetPath(asset.sha256,config))),annotations=listAnnotations(asset.id,db),pageCount=pdf.getPageCount();
  for(const annotation of annotations){if(!Number.isInteger(annotation.page)||annotation.page<1||annotation.page>pageCount)continue;const page=pdf.getPage(annotation.page-1),{width,height}=page.getSize(),g=annotation.geometry;if(!g||typeof g!=="object")continue;let c;try{c=color(annotation.color)}catch{continue}
    if(annotation.kind==="highlight"&&[g.x,g.y,g.width,g.height].every(Number.isFinite)){page.drawRectangle({x:g.x*width,y:height-(g.y+g.height)*height,width:g.width*width,height:g.height*height,color:c,opacity:HIGHLIGHT_OPACITY});if(annotation.comment)drawComment(page,g.x*width,(height-(g.y+g.height)*height)+g.height*height,annotation.comment)}
    if(annotation.kind==="text"&&[g.x,g.y,g.width,g.height].every(Number.isFinite)){
      const size=Math.max(TEXT_MIN_SIZE,Math.min(TEXT_MAX_SIZE,(g.height||0.03)*height));
      try{page.drawText(annotation.content||"Note",{x:g.x*width,y:height-(g.y+g.height)*height,size,color:c})}catch{throw Object.assign(new Error("Annotation text contains characters unsupported by PDF export"),{status:422,code:"PDF_TEXT_ENCODING"})}
      if(annotation.comment)drawComment(page,g.x*width,height-(g.y+g.height)*height-size-4,annotation.comment);
    }
    if(annotation.kind==="ink"&&Array.isArray(g.points)){
      const points=g.points.filter(point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)).map(point=>({x:point[0]*width,y:height-point[1]*height}));
      if(points.length<2)continue;
      const smoothed=smoothInk(points);
      for(let i=1;i<smoothed.length;i++)page.drawLine({start:smoothed[i-1],end:smoothed[i],color:c,thickness:INK_THICKNESS});
    }
  }
  return {bytes:await pdf.save(),filename:`${safeName(asset.name.replace(/\.pdf$/i,""))}-annotated-${new Date().toISOString().slice(0,10)}.pdf`};
}

const COMMENT_COLOR=rgb(.35,.32,.27);
function drawComment(page,x,y,text){
  try{page.drawText(`※ ${String(text).slice(0,120)}`,{x:x+6,y,size:9,color:COMMENT_COLOR})}catch{/* skip comments with unsupported glyphs */}
}
