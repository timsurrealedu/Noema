import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {runGeminiMultimodal} from "../../ai.mjs";
import {failJob,finishJob} from "../../jobs.mjs";
import {strokesToPng} from "../../ink-raster.mjs";

// Handwritten math continuation (S6): propose the next LaTeX step for
// half-finished work. Strokes are never modified; the result is a proposed
// markdown block behind diff-review.
export async function handleContinueMath({job,config,db}){
  try{
    const block=db.prepare(`SELECT i.*,b.note_id,s.root_path FROM note_ink_blocks i JOIN note_blocks b ON b.id=i.block_id JOIN vault_entries e ON e.note_id=b.note_id JOIN vault_sources s ON s.id=e.source_id WHERE i.block_id=?`).get(job.input.blockId);
    if(!block)throw new Error("Ink block not found");
    if(!config.geminiApiKey)throw new Error("Math continuation requires GEMINI_API_KEY");
    const trailing=db.prepare("SELECT markdown FROM note_blocks WHERE note_id=? AND kind='markdown' ORDER BY position").all(block.note_id).map(row=>row.markdown).join("\n").slice(-6000);
    const strokes=JSON.parse(readFileSync(join(block.root_path,block.json_path),"utf8"));
    const base64=strokesToPng(strokes).toString("base64");
    const schema={type:"object",required:["analysis","continuation","confidence","assumptions"],properties:{analysis:{type:"string"},continuation:{type:"string"},confidence:{enum:["high","medium","low"]},assumptions:{type:"array",items:{type:"string"}}}};
    const prompt=`A student has half-finished handwritten mathematics. Continue their work by proposing the next step as a single Markdown block. Use LaTeX ($…$ inline, $$…$$ display). Never alter or restate the original strokes; propose only the continuation. Explain your reasoning briefly in analysis and list any assumptions.

Existing note text (trailing context):
${trailing || "(no typed text)"}

OCR transcript of this ink block:
${block.transcript||"(none)"}
${block.equations_json&&block.equations_json!=="[]"?`Known equations: ${block.equations_json}`:""}
Return only the required structured result.`;
    const {result}=await runGeminiMultimodal({prompt,base64,mimeType:"image/png",schema,config});
    const time=new Date().toISOString(),id=randomUUID();
    db.prepare("INSERT INTO math_continuations(id,note_id,block_id,workspace_id,analysis,continuation,confidence,assumptions_json,state,provider,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id,block.note_id,block.block_id,job.workspace_id,String(result.analysis||"").slice(0,5000),String(result.continuation||"").slice(0,20000),["high","medium","low"].includes(result.confidence)?result.confidence:"low",JSON.stringify((Array.isArray(result.assumptions)?result.assumptions:[]).slice(0,10)),"proposed","gemini",time,time);
    finishJob(job.id,{continuationId:id,status:"proposed"},db);
  }catch(error){failJob(job.id,error,db)}
}
