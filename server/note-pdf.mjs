import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import {exportMarkdown} from "./core.mjs";

const safe=value=>String(value||"note").replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"")||"note";
const wrap=(text,font,size,width)=>{const words=text.split(/\s+/),lines=[];let line="";for(const word of words){const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,size)<=width)line=next;else{if(line)lines.push(line);line=word}}if(line)lines.push(line);return lines};
export async function notePdf(noteId,db,workspaceId){
  const markdown=exportMarkdown(noteId,db,workspaceId),title=markdown.match(/^#\s+(.+)$/m)?.[1]||"Noema note",pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page=pdf.addPage(),y=792-54;
  const line=(text,size=11,heavy=false)=>{const font=heavy?bold:regular;for(const row of wrap(text,font,size,500)){if(y<size+42){page=pdf.addPage();y=792-54}page.drawText(row,{x:48,y,size,font,color:rgb(.15,.14,.12)});y-=size+6}};
  page.drawText(title,{x:48,y,size:20,font:bold,color:rgb(.15,.14,.12)});y-=34;page.drawText(`Exported from Noema · ${new Date().toLocaleDateString("en-CA")}`,{x:48,y,size:9,font:regular,color:rgb(.35,.32,.27)});y-=28;
  for(const raw of markdown.split(/\r?\n/)){if(!raw.trim()){y-=6;continue}const heading=raw.match(/^(#{1,3})\s+(.+)/);if(heading)line(heading[2],heading[1].length===1?18:heading[1].length===2?14:12,true);else if(raw.startsWith("```"))line(raw,9,true);else line(raw.replace(/^[-*]\s+/,"• ").replace(/`([^`]+)`/g,"$1"))}
  return {bytes:await pdf.save(),filename:`${safe(title)}-${new Date().toISOString().slice(0,10)}.pdf`};
}
