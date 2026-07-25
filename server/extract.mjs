import {execFile} from "node:child_process";
import {readFile} from "node:fs/promises";
import {promisify} from "node:util";
import {assetPath} from "./objects.mjs";
import {loadConfig} from "./config.mjs";

const execFileAsync=promisify(execFile);
const maxExtractedChars=20000;

/**
 * Deterministic text extraction. Returns {text,tool} or null when the asset
 * type has no deterministic adapter (images and audio need OCR/transcription).
 */
export async function extractText(asset,config=loadConfig()){
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
  return null;
}
