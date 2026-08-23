import {execFile} from "node:child_process";
import {mkdtempSync,readdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {promisify} from "node:util";

const execFileAsync=promisify(execFile);
const DOCX="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const docxConversionDisabled=()=>process.env.NOEMA_DOCX_CONVERSION==="off";

/**
 * Convert a DOCX asset to PDF with LibreOffice headless. Returns the converted
 * file bytes or null when conversion is disabled or LibreOffice is unavailable
 * — callers must degrade gracefully (the original DOCX stays usable).
 */
export async function convertDocxToPdf(bytes){
  if(docxConversionDisabled())return null;
  const dir=mkdtempSync(join(tmpdir(),"noema-docx-")),source=join(dir,"input.docx");
  const {writeFileSync}=await import("node:fs");
  writeFileSync(source,bytes,{mode:0o600});
  try{
    await execFileAsync("soffice",["--headless","--norestore","--convert-to","pdf","--outdir",dir,source],{timeout:120000});
    const output=readdirSync(dir).find(name=>name.endsWith(".pdf"));
    if(!output)return null;
    return await import("node:fs").then(fs=>fs.readFileSync(join(dir,output)));
  }catch{
    return null;
  }
}
