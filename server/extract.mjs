import {execFile} from "node:child_process";
import {readFile} from "node:fs/promises";
import {promisify} from "node:util";
import {assetPath} from "./objects.mjs";
import {loadConfig} from "./config.mjs";
import {runGeminiMultimodal} from "./ai.mjs";

const execFileAsync=promisify(execFile);
const maxExtractedChars=20000;
export const maxMultimodalBytes=10*1024*1024;
function stripXml(xml){return xml.replace(/<[^>]+>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim()}

/**
 * Deterministic text extraction. Returns {text,tool} or null when the asset
 * type has no deterministic adapter (images and audio need OCR/transcription).
 */
export async function extractText(asset,config=loadConfig(),fetcher=fetch){
  const path=assetPath(asset.sha256,config);
  if(asset.mime.startsWith("text/")){
    const content=await readFile(path,"utf8");
    return {text:content.slice(0,maxExtractedChars),tool:"read"};
  }
  if(asset.mime==="application/pdf"){
    try{
      const {stdout}=await execFileAsync("pdftotext",["-layout",path,"-"],{timeout:30000,maxBuffer:4*1024*1024});
      const text=String(stdout).trim();return text?{text:text.slice(0,maxExtractedChars),tool:"pdftotext"}:null;
    }catch{return null}
  }
  if(asset.mime==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
    try{
      const {stdout}=await execFileAsync("unzip",["-p",path,"word/document.xml"],{timeout:30000,maxBuffer:4*1024*1024});
      const text=stripXml(String(stdout));return text?{text:text.slice(0,maxExtractedChars),tool:"docx"}:null;
    }catch{return null}
  }
  if((asset.mime.startsWith("image/")||asset.mime.startsWith("audio/"))&&config.geminiApiKey){
    if(asset.size>maxMultimodalBytes)return null;
    try{
      const base64=await readFile(path,"base64");
      const prompt=asset.mime.startsWith("image/")?"Extract all visible text from this image.":"Transcribe the spoken content from this audio file.";
      const {result}=await runGeminiMultimodal({prompt,base64,mimeType:asset.mime,schema:{type:"object",properties:{text:{type:"string"}},required:["text"]},config,fetcher});
      const text=String(result.text||"").trim();return text?{text:text.slice(0,maxExtractedChars),tool:"gemini"}:null;
    }catch{return null}
  }
  return null;
}

/**
 * Structured image extraction: visible text plus LaTeX equations and tables
 * rendered as Markdown. Requires a Gemini API key (the model sees pixels).
 */
export async function extractStructuredImage(asset,config=loadConfig(),fetcher=fetch){
  if(!asset.mime.startsWith("image/"))throw Object.assign(new Error("Structured extraction requires an image"),{status:400});
  if(!config.geminiApiKey)throw new Error("Structured image extraction requires GEMINI_API_KEY");
  if(asset.size>maxMultimodalBytes)throw Object.assign(new Error("Image exceeds the multimodal size limit"),{status:413});
  const base64=await readFile(assetPath(asset.sha256,config),"base64");
  const schema={type:"object",properties:{text:{type:"string"},equations:{type:"array",items:{type:"object",properties:{latex:{type:"string"},confidence:{type:"string",enum:["high","medium","low"]}},required:["latex","confidence"]}},tables:{type:"array",items:{type:"object",properties:{markdown:{type:"string"}},required:["markdown"]}}},required:["text","equations","tables"]};
  const {result}=await runGeminiMultimodal({prompt:"Read this image. Return every visible text fragment, each mathematical expression as LaTeX with a confidence rating, and every table as GitHub-flavored Markdown.",base64,mimeType:asset.mime,schema,config,fetcher});
  const text=String(result.text||"").trim();
  const equations=(result.equations||[]).map(e=>({latex:String(e.latex||""),confidence:["high","medium","low"].includes(e.confidence)?e.confidence:"low"})).filter(e=>e.latex);
  const tables=(result.tables||[]).map(t=>({markdown:String(t.markdown||"").trim()})).filter(t=>t.markdown);
  return {text,equations,tables};
}

export function structuredImageToMarkdown(extraction,name="Image"){
  const parts=[`### ${name}`,extraction.text];
  if(extraction.equations?.length)parts.push(...extraction.equations.map(e=>`$$${e.latex}$$${e.confidence&&e.confidence!=="high"?` <!-- confidence: ${e.confidence} -->`:""}`));
  if(extraction.tables?.length)parts.push(...extraction.tables.map(t=>t.markdown));
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Extract handwritten text and math from an image, returning plain text and
 * LaTeX equations. Requires a Gemini API key.
 */
export async function extractHandwriting(asset,config=loadConfig(),fetcher=fetch){
  if(!asset.mime.startsWith("image/"))throw Object.assign(new Error("Handwriting extraction requires an image"),{status:400});
  if(!config.geminiApiKey)throw new Error("Handwriting extraction requires GEMINI_API_KEY");
  const base64=await readFile(assetPath(asset.sha256,config),"base64");
  const schema={type:"object",properties:{text:{type:"string"},equations:{type:"array",items:{type:"object",properties:{latex:{type:"string"},confidence:{type:"string",enum:["high","medium","low"]}},required:["latex","confidence"]}}},required:["text","equations"]};
  const {result}=await runGeminiMultimodal({prompt:"Extract all handwritten text and mathematical notation from this image. Return the plain text and each equation as LaTeX.",base64,mimeType:asset.mime,schema,config,fetcher});
  const text=String(result.text||"").trim();
  const equations=(result.equations||[]).map(e=>({latex:String(e.latex||""),confidence:["high","medium","low"].includes(e.confidence)?e.confidence:"low"}));
  return {text,equations};
}
