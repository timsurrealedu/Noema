import {readFileSync} from "node:fs";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {exportMarkdown} from "./core.mjs";

const safe=value=>String(value||"note").replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"")||"note";
const INK=rgb(.15,.14,.12),MUTED=rgb(.35,.32,.27),CODE_BG=rgb(.94,.93,.9);
const MARGIN=48,TOP=792-54,BODY_WIDTH=500;

const cjkCandidates=[process.env.NOEMA_CJK_FONT,"/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc","/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc","/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf"].filter(Boolean);

function embedCjk(pdf,subset=true){
  for(const path of cjkCandidates){
    try{
      const bytes=readFileSync(path);
      if(bytes.length>4&&bytes.toString("ascii",0,4)==="ttcf")continue; // font collections are unsupported by pdf-lib
      return pdf.embedFont(bytes,{subset});
    }catch{/* try the next candidate */}
  }
  return null;
}
const needsWideFont=text=>/[^\u0000-\u24ff]/.test(text);

function inlineRuns(text){
  const runs=[];let buffer="";
  const flush=()=>{if(buffer){runs.push({text:buffer,font:"regular"});buffer=""}};
  let index=0;
  while(index<text.length){
    const rest=text.slice(index);
    const bold=rest.match(/^\*\*([^*]+)\*\*/),code=rest.match(/^`([^`]+)`/),italic=rest.match(/^\*([^*]+)\*/),link=rest.match(/^\[([^\]]+)\]\([^)]*\)/);
    if(bold){flush();runs.push({text:bold[1],font:"bold"});index+=bold[0].length}
    else if(link){flush();runs.push({text:link[1],font:"bold"});index+=link[0].length}
    else if(code){flush();runs.push({text:code[1],font:"code"});index+=code[0].length}
    else if(italic){flush();runs.push({text:italic[1],font:"regular"});index+=italic[0].length}
    else{buffer+=text[index];index+=1}
  }
  flush();
  return runs;
}

function runWidth(text,font,size){try{return font.widthOfTextAtSize(text,size)}catch{return text.length*size*.55}}

export async function notePdf(noteId,db,workspaceId){
  try{
    return await renderNotePdf(noteId,db,workspaceId,true);
  }catch(error){
    // Font collections (.ttc) cannot be subset by fontkit; retry embedding the full font.
    if(error&&error.code==="FONT_SUBSET_UNSUPPORTED")return renderNotePdf(noteId,db,workspaceId,false);
    throw error;
  }
}

async function renderNotePdf(noteId,db,workspaceId,subset){
  const markdown=exportMarkdown(noteId,db,workspaceId);
  const title=markdown.match(/^#\s+(.+)$/m)?.[1]||"Noema note";
  const pdf=await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),mono=await pdf.embedFont(StandardFonts.Courier);
  let wide=null;
  let page=pdf.addPage(),y=TOP;
  const newPage=()=>{page=pdf.addPage();y=TOP};
  const ensure=size=>{if(y<size+30)newPage()};
  const pickFont=(text,font)=>needsWideFont(text)&&wide?wide:font;
  const emit=(text,{size=11,font=regular,color=INK,indent=0})=>{
    if(needsWideFont(text)){
      wide=wide||embedCjk(pdf,subset);
      if(!wide)throw Object.assign(new Error("This note contains characters outside Latin scripts. Set NOEMA_CJK_FONT to a Unicode TTF/TTC so exports stay readable."),{status:422,code:"PDF_TEXT_ENCODING"});
    }
    try{page.drawText(text,{x:MARGIN+indent,y,size,font:pickFont(text,font),color})}
    catch{page.drawText(text.replace(/[^\u0000-\u00ff]/g,"?"),{x:MARGIN+indent,y,size,font,color})}
  };
  const drawLine=(text,options={})=>{
    const {size=11,heavy=false,monospace=false,color=INK,indent=0}=options;
    const baseFont=monospace?mono:heavy?bold:regular,width=BODY_WIDTH-indent;
    const words=text.split(/\s+/);let line="";
    for(const word of words){
      const next=line?`${line} ${word}`:word;
      if(!line||runWidth(next,pickFont(next,baseFont),size)<=width)line=next;
      else{emit(line,{size,font:baseFont,color,indent});y-=size+5;line=word}
    }
    if(line){ensure(size);emit(line,{size,font:baseFont,color,indent});y-=size+5}
  };

  ensure(20);
  page.drawText(title,{x:MARGIN,y,size:20,font:bold,color:INK});y-=34;
  page.drawText(`Exported from Noema · ${new Date().toLocaleDateString("en-CA")}`,{x:MARGIN,y,size:9,font:regular,color:MUTED});y-=28;

  const lines=markdown.split(/\r?\n/);
  for(let index=0;index<lines.length;index++){
    const raw=lines[index];
    if(!raw.trim()){y-=6;continue}
    if(raw.startsWith("```")){
      index+=1;
      while(index<lines.length&&!lines[index].startsWith("```")){
        ensure(12);
        page.drawRectangle({x:MARGIN,y:y-2,width:BODY_WIDTH,height:13,color:CODE_BG});
        drawLine(lines[index],{size:9,monospace:true,indent:6});
        index+=1;
      }
      y-=6;continue;
    }
    const heading=raw.match(/^(#{1,4})\s+(.+)/);
    if(heading){y-=6;drawLine(heading[2],{size:[18,14,12,11][heading[1].length-1],heavy:true});continue}
    if(/^(---|\*\*\*|___)\s*$/.test(raw)){ensure(8);page.drawLine({start:{x:MARGIN,y},end:{x:MARGIN+BODY_WIDTH,y},thickness:.5,color:MUTED});y-=12;continue}
    const quote=raw.match(/^>\s?(.*)/);
    if(quote){drawLine(quote[1],{indent:14,color:MUTED});continue}
    const bullet=raw.match(/^(\s*)[-*+]\s+(.*)/);
    if(bullet){drawLine(`• ${bullet[2]}`,{indent:10+Math.floor(bullet[1].length/2)*10});continue}
    const ordered=raw.match(/^(\s*)\d+[.)]\s+(.*)/);
    if(ordered){drawLine(ordered[2],{indent:10+Math.floor(ordered[1].length/2)*10});continue}
    if(raw.trim().startsWith("|")&&/^\|?[\s:-]+\|/.test(lines[index+1]||"")){
      const cells=line=>line.split("|").slice(1,-1).map(cell=>cell.trim());
      drawLine(cells(raw).join("  ·  "),{heavy:true});index+=2;
      while(index<lines.length&&lines[index].trim().startsWith("|")){drawLine(cells(lines[index]).join("  ·  "));index+=1}
      index-=1;y-=4;continue;
    }
    for(const run of inlineRuns(raw))drawLine(run.text,{heavy:run.font==="bold",monospace:run.font==="code"});
  }
  try{
    return {bytes:await pdf.save(),filename:`${safe(title)}-${new Date().toISOString().slice(0,10)}.pdf`};
  }catch(error){
    if(String(error?.message).includes("createSubset"))throw Object.assign(new Error("font subset unsupported"),{code:"FONT_SUBSET_UNSUPPORTED"});
    throw error;
  }
}
