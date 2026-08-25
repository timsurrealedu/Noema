import {readFileSync} from "node:fs";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {exportMarkdown} from "./core.mjs";
import {getDatabase} from "./db.mjs";
import {assetPath,getAsset} from "./objects.mjs";
import {loadConfig} from "./config.mjs";

const safe=value=>String(value||"note").replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"")||"note";
const INK=rgb(.15,.14,.12),MUTED=rgb(.35,.32,.27),CODE_BG=rgb(.94,.93,.9),MATH_BG=rgb(.93,.95,.99);
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

const GREEK={alpha:"α",beta:"β",gamma:"γ",delta:"δ",epsilon:"ε",varepsilon:"ε",zeta:"ζ",eta:"η",theta:"θ",vartheta:"ϑ",iota:"ι",kappa:"κ",lambda:"λ",mu:"μ",nu:"ν",xi:"ξ",pi:"π",rho:"ρ",sigma:"σ",tau:"τ",upsilon:"υ",phi:"φ",varphi:"φ",chi:"χ",psi:"ψ",omega:"ω",Gamma:"Γ",Delta:"Δ",Theta:"Θ",Lambda:"Λ",Xi:"Ξ",Pi:"Π",Sigma:"Σ",Phi:"Φ",Psi:"Ψ",Omega:"Ω"};
const OPS={times:"×",cdot:"·",div:"÷",pm:"±",mp:"∓",leq:"≤",le:"≤",geq:"≥",ge:"≥",neq:"≠",ne:"≠",approx:"≈",equiv:"≡",sim:"∼",simeq:"≃",propto:"∝",infty:"∞",partial:"∂",nabla:"∇",forall:"∀",exists:"∃",nexists:"∄","in":"∈",notin:"∉",ni:"∋",subset:"⊂",supset:"⊃",subseteq:"⊆",supseteq:"⊇",cup:"∪",cap:"∩",emptyset:"∅",varnothing:"∅",setminus:"∖",rightarrow:"→",to:"→",leftarrow:"←",leftrightarrow:"↔",Rightarrow:"⇒",implies:"⇒",Leftarrow:"⇐",Leftrightarrow:"⇔",mapsto:"↦",uparrow:"↑",downarrow:"↓",sum:"∑",prod:"∏",coprod:"∐",int:"∫",iint:"∬",iiint:"∭",oint:"∮",sqrt:"√",cbrt:"∛",angle:"∠",perp:"⊥",parallel:"∥",mid:"∣",therefore:"∴",because:"∵",ldots:"…",cdots:"⋯",dots:"…",vdots:"⋮",prime:"′",degree:"°",circ:"∘",bullet:"∙",star:"⋆",oplus:"⊕",ominus:"⊖",otimes:"⊗",odot:"⊙",hbar:"ℏ",ell:"ℓ",Re:"ℜ",Im:"ℑ",aleph:"ℵ",neg:"¬",lnot:"¬",land:"∧",wedge:"∧",lor:"∨",vee:"∨",top:"⊤",bot:"⊥",vdash:"⊢",models:"⊨",langle:"⟨",rangle:"⟩"};
const SUP={"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","+":"⁺","-":"⁻","=":"⁼","(":"⁽",")":"⁾","n":"ⁿ","i":"ⁱ","a":"ᵃ","b":"ᵇ","k":"ᵏ","m":"ᵐ","t":"ᵗ","x":"ˣ"};
const SUB={"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉","+":"₊","-":"₋","=":"₌","(":"₍",")":"₎","a":"ₐ","e":"ₑ","h":"ₕ","i":"ᵢ","j":"ⱼ","k":"ₖ","l":"ₗ","m":"ₘ","n":"ₙ","o":"ₒ","p":"ₚ","r":"ᵣ","s":"ₛ","t":"ₜ","u":"ᵤ","v":"ᵥ","x":"ₓ"};

function latexToUnicode(input){
  let s=String(input||"").trim();
  s=s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\s*([\(\)\[\]\{\}\|\.])/g,"$1");
  for(let pass=0;pass<3;pass++){
    s=s.replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g,(_m,a,b)=>`(${a})/(${b})`);
    s=s.replace(/\\sqrt\{([^{}]*)\}/g,"√($1)");
    s=s.replace(/\\(?:text|mathrm|mathbf|mathit|mathbb|mathcal|operatorname|boldsymbol)\{([^{}]*)\}/g,"$1");
    s=s.replace(/\\begin\{[a-z*]+\}|\\end\{[a-z*]+\}|\\\\|&/g," ");
  }
  s=s.replace(/\^\{([^{}]+)\}|\^(\S)/g,(_m,g1,g2)=>[...(g1??g2)].map(c=>SUP[c]??c).join(""));
  s=s.replace(/_\{([^{}]+)\}|_(\S)/g,(_m,g1,g2)=>[...(g1??g2)].map(c=>SUB[c]??c).join(""));
  s=s.replace(/\\([A-Za-z]+)/g,(_m,name)=>GREEK[name]??OPS[name]??" ");
  s=s.replace(/[{}]/g,"").replace(/\s+/g," ").trim();
  return s;
}
function asciiMathFallback(text){
  const reverse={...Object.fromEntries(Object.entries(GREEK).map(([k,v])=>[v,k])),...Object.fromEntries(Object.entries(OPS).map(([k,v])=>[v,k]))};
  return [...text].map(ch=>reverse[ch]??(ch.codePointAt(0)>0xff?"?":ch)).join("");
}

function inlineRuns(text){
  const runs=[];let buffer="";
  const flush=()=>{if(buffer){runs.push({text:buffer,font:"regular"});buffer=""}};
  let index=0;
  while(index<text.length){
    const rest=text.slice(index);
    const math=rest.match(/^\$([^$\n]+)\$/),display=rest.match(/^\$\$([^$]+)\$\$/),bold=rest.match(/^\*\*([^*]+)\*\*/),code=rest.match(/^`([^`]+)`/),italic=rest.match(/^\*([^*]+)\*/),link=rest.match(/^\[([^\]]+)\]\(([^)]*)\)/),image=rest.match(/^!\[([^\]]*)\]\(([^)]*)\)/);
    if(display){flush();runs.push({text:latexToUnicode(display[1]),font:"italic"});index+=display[0].length}
    else if(math){flush();runs.push({text:latexToUnicode(math[1]),font:"italic"});index+=math[0].length}
    else if(bold){flush();runs.push({text:bold[1],font:"bold"});index+=bold[0].length}
    else if(link){flush();runs.push({text:link[1],font:"bold"});index+=link[0].length}
    else if(code){flush();runs.push({text:code[1],font:"code"});index+=code[0].length}
    else if(image){flush();runs.push({text:`[image: ${image[1]||image[2]}]`,font:"muted"});index+=image[0].length}
    else if(italic){flush();runs.push({text:italic[1],font:"regular"});index+=italic[0].length}
    else{buffer+=text[index];index+=1}
  }
  flush();
  return runs;
}

function runWidth(text,font,size){try{return font.widthOfTextAtSize(text,size)}catch{return text.length*size*.55}}

export async function notePdf(noteId,db=getDatabase(),workspaceId,config){
  try{
    return await renderNotePdf(noteId,db,workspaceId,config??undefined,true);
  }catch(error){
    // Font collections (.ttc) cannot be subset by fontkit; retry embedding the full font.
    if(error&&error.code==="FONT_SUBSET_UNSUPPORTED")return renderNotePdf(noteId,db,workspaceId,config??undefined,false);
    throw error;
  }
}

function hexColor(value){
  const match=/^#([0-9a-f]{6})$/i.exec(String(value||"").trim());
  if(!match)return INK;
  return rgb(parseInt(match[1].slice(0,2),16)/255,parseInt(match[1].slice(2,4),16)/255,parseInt(match[1].slice(4,6),16)/255);
}

async function renderNotePdf(noteId,db,workspaceId,config,subset){
  config=config||loadConfig();
  const exported=exportMarkdown(noteId,db,workspaceId);
  const blocks=db.prepare("SELECT b.id,b.kind,b.markdown,i.width,i.height,i.strokes_json AS strokesJson FROM note_blocks b LEFT JOIN note_ink_blocks i ON i.block_id=b.id WHERE b.note_id=? ORDER BY b.position").all(noteId);
  const markdown=blocks.some(block=>block.kind==="ink")?blocks.map(block=>block.kind==="ink"?`![[Attachments/Noema Ink/${block.id}.svg]]`:block.markdown||"").join("\n\n"):exported;
  const title=markdown.match(/^#\s+(.+)$/m)?.[1]||"Noema note";
  const inkBlocks=new Map(blocks.filter(block=>block.kind==="ink").map(block=>[block.id,block]));
  const resolveInk=id=>{
    try{
      const block=inkBlocks.get(id),strokes=JSON.parse(block?.strokesJson||"null");
      return Array.isArray(strokes)&&block.width&&block.height?{width:block.width,height:block.height,strokes}:null;
    }catch{return null}
  };
  const pdf=await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),mono=await pdf.embedFont(StandardFonts.Courier),italic=await pdf.embedFont(StandardFonts.HelveticaOblique);
  let wide=null;
  let page=pdf.addPage(),y=TOP;
  const newPage=()=>{page=pdf.addPage();y=TOP};
  const ensure=size=>{if(y<size+30)newPage()};
  const ensureWide=text=>{
    if(!needsWideFont(text))return null;
    wide=wide||embedCjk(pdf,subset);
    if(!wide)throw Object.assign(new Error("This note contains characters outside Latin scripts. Set NOEMA_CJK_FONT to a Unicode TTF/TTC so exports stay readable."),{status:422,code:"PDF_TEXT_ENCODING"});
    return wide;
  };
  const pickFont=(text,font)=>needsWideFont(text)&&wide?wide:font;
  const emit=(text,{size=11,font=regular,color=INK,indent=0})=>{
    ensureWide(text);
    try{page.drawText(text,{x:MARGIN+indent,y,size,font:pickFont(text,font),color})}
    catch{page.drawText(text.replace(/[^\u0000-\u00ff]/g,"?"),{x:MARGIN+indent,y,size,font,color})}
  };

  const drawImageBlock=async(url,caption)=>{
    const match=/\/api\/v1\/assets\/([0-9a-f-]{16,64})/i.exec(url||"");
    if(!match){drawLine(`[image: ${caption||url||"embedded asset"}]`,{color:MUTED});return}
    const row=getAsset(match[1],db,workspaceId);
    if(!row){drawLine(`[missing image: ${caption||match[1]}]`,{color:MUTED});return}
    try{
      const bytes=readFileSync(assetPath(row.sha256,config));
      const isPng=bytes.length>8&&bytes[0]===0x89&&bytes.toString("ascii",1,4)==="PNG";
      const isJpg=bytes.length>3&&bytes[0]===0xFF&&bytes[1]===0xD8;
      if(!isPng&&!isJpg){drawLine(`[unsupported image format: ${row.name}]`,{color:MUTED});return}
      const image=isPng?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
      const ratio=image.height/Math.max(1,image.width),width=Math.min(BODY_WIDTH,image.width),height=Math.min(520,width*ratio);
      ensure(height+18);
      page.drawImage(image,{x:MARGIN+(BODY_WIDTH-width)/2,y:y-height,width,height});
      y-=height+12;
    }catch(error){
      drawLine(`[image could not be embedded: ${error?.message||row.name}]`,{color:MUTED});
    }
  };

  const drawInkBlock=(inkId)=>{
    const sidecar=resolveInk(inkId);
    if(!sidecar){drawLine(`[handwriting block ${inkId.slice(0,8)} not available in export]`,{color:MUTED});return}
    const scale=Math.min(BODY_WIDTH/sidecar.width,480/sidecar.height),blockHeight=sidecar.height*scale;
    ensure(blockHeight+20);
    const top=y;
    for(const stroke of sidecar.strokes){
      const points=stroke.points||[];
      if(points.length<2)continue;
      const d=points.map((point,index)=>`${index?"L":"M"}${(point.x*scale).toFixed(1)} ${(point.y*scale).toFixed(1)}`).join(" ");
      const color=stroke.tool==="highlighter"?hexColor(stroke.color):hexColor(stroke.color);
      try{
        page.drawSvgPath(d,{x:MARGIN,y:top,scale:1,borderColor:color,borderWidth:Math.max(.6,(stroke.width||3)*scale*(stroke.tool==="highlighter"?4:1)),borderLineJoinColor:undefined});
      }catch{/* skip malformed stroke */}
    }
    y=top-blockHeight-14;
  };

  const drawEquationCard=(latex)=>{
    const text=latexToUnicode(latex);
    ensure(30);
    let font=italic;
    try{
      ensureWide(text);
      if(needsWideFont(text))font=wide;
      const size=12,maxWidth=BODY_WIDTH-24;
      const words=text.split(" "),lines=[];let line="";
      for(const word of words){
        const next=line?`${line} ${word}`:word;
        if(!line||runWidth(next,pickFont(next,font),size)<=maxWidth)line=next;
        else{lines.push(line);line=word}
      }
      if(line)lines.push(line);
      const height=lines.length*(size+5)+12;
      if(y-height<40)newPage();
      page.drawRectangle({x:MARGIN,y:y-height,width:BODY_WIDTH,height,color:MATH_BG});
      let cursor=y-8-size;
      for(const item of lines){
        const width=runWidth(item,pickFont(item,font),size);
        page.drawText(item,{x:MARGIN+(BODY_WIDTH-width)/2,y:cursor,size,font:pickFont(item,font),color:INK});
        cursor-=size+5;
      }
      y-=height+8;
    }catch{
      const fallback=asciiMathFallback(text);
      drawLine(fallback,{monospace:true,indent:12});
      y-=4;
    }
  };

  ensure(20);
  page.drawText(title,{x:MARGIN,y,size:20,font:bold,color:INK});y-=34;
  page.drawText(`Exported from Noema · ${new Date().toLocaleDateString("en-CA")}`,{x:MARGIN,y,size:9,font:regular,color:MUTED});y-=28;

  const lines=markdown.split(/\r?\n/);
  for(let index=0;index<lines.length;index++){
    const raw=lines[index];
    if(!raw.trim()){y-=6;continue}
    if(raw.trim().startsWith("<!--"))continue;
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
    const displayMath=raw.match(/^\$\$(.+)\$\$$/);
    if(displayMath){drawEquationCard(displayMath[1]);continue}
    if(raw.trim()==="$$"){
      const buffer=[];
      index+=1;
      while(index<lines.length&&lines[index].trim()!=="$$"){buffer.push(lines[index]);index+=1}
      drawEquationCard(buffer.join(" "));
      continue;
    }
    const heading=raw.match(/^(#{1,4})\s+(.+)/);
    if(heading){y-=6;drawLine(heading[2],{size:[18,14,12,11][heading[1].length-1],heavy:true});continue}
    if(/^(---|\*\*\*|___)\s*$/.test(raw)){ensure(8);page.drawLine({start:{x:MARGIN,y},end:{x:MARGIN+BODY_WIDTH,y},thickness:.5,color:MUTED});y-=12;continue}
    const quote=raw.match(/^>\s?(.*)/);
    if(quote){drawLine(quote[1],{indent:14,color:MUTED});continue}
    const bullet=raw.match(/^(\s*)[-*+]\s+(.*)/);
    if(bullet){await drawInlineContent(bullet[2],{indent:10+Math.floor(bullet[1].length/2)*10});continue}
    const ordered=raw.match(/^(\s*)\d+[.)]\s+(.*)/);
    if(ordered){await drawInlineContent(ordered[2],{indent:10+Math.floor(ordered[1].length/2)*10});continue}
    if(raw.trim().startsWith("|")&&/^\|?[\s:-]+\|/.test(lines[index+1]||"")){
      const cells=line=>line.split("|").slice(1,-1).map(cell=>cell.trim());
      drawLine(cells(raw).join("  ·  "),{heavy:true});index+=2;
      while(index<lines.length&&lines[index].trim().startsWith("|")){drawLine(cells(lines[index]).join("  ·  "));index+=1}
      index-=1;y-=4;continue;
    }
    await drawInlineContent(raw,{});
  }
  try{
    return {bytes:await pdf.save(),filename:`${safe(title)}-${new Date().toISOString().slice(0,10)}.pdf`};
  }catch(error){
    if(String(error?.message).includes("createSubset"))throw Object.assign(new Error("font subset unsupported"),{code:"FONT_SUBSET_UNSUPPORTED"});
    throw error;
  }

  async function drawInlineContent(text,options={}){
    const image=/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(text);
    if(image){await drawImageBlock(image[2],image[1]);return}
    const ink=/^\s*!\[\[Attachments\/Noema Ink\/([0-9a-f-]+)\.svg\]\]\s*$/.exec(text);
    if(ink){drawInkBlock(ink[1]);return}
    const wikilinkEmbed=/^\s*!\[\[([^\]]+)\]\]\s*$/.exec(text);
    if(wikilinkEmbed){drawLine(`[embedded attachment: ${wikilinkEmbed[1]}]`,{color:MUTED});return}
    for(const run of inlineRuns(text))drawLine(run.text,{heavy:run.font==="bold",monospace:run.font==="code",italic:run.font==="italic",muted:run.font==="muted",...options});
  }

  function drawLine(text,options={}){
    const {size=11,heavy=false,monospace=false,italic:slanted=false,muted=false,color=muted?MUTED:INK,indent=0}=options;
    const baseFont=monospace?mono:heavy?bold:slanted?italic:regular,width=BODY_WIDTH-indent;
    ensureWide(text);
    const words=text.split(/\s+/);let line="";
    for(const word of words){
      const next=line?`${line} ${word}`:word;
      if(!line||runWidth(next,pickFont(next,baseFont),size)<=width)line=next;
      else{emit(line,{size,font:baseFont,color,indent});y-=size+5;line=word}
    }
    if(line){ensure(size);emit(line,{size,font:baseFont,color,indent});y-=size+5}
  }
}
