import {resolve} from "node:path";
import {runAI} from "../../ai.mjs";
import {assertNotCancelled,failJob,finishJob} from "../../jobs.mjs";
import {listNoteBlocks,listVaultFolders,moveVaultEntry,reorderNoteBlocks,saveMarkdownBlock} from "../../vault.mjs";
import {aiEventHandler} from "../job-events.mjs";

const schema={type:"object",additionalProperties:false,required:["markdown","action","confidence"],properties:{markdown:{type:"string",minLength:1,maxLength:100000},action:{enum:["summary","expansion"]},confidence:{type:"number",minimum:0,maximum:1},title:{type:"string",maxLength:200},destinationFolder:{type:"string",maxLength:1000}}};

export async function handleHandwritingIntake({job,config,db,run=runAI}){
  const time=new Date().toISOString();
  try{
    const intake=db.prepare("SELECT h.*,n.title,n.draft,i.transcript,i.ocr_status FROM handwriting_intakes h JOIN notes n ON n.id=h.note_id JOIN note_ink_blocks i ON i.block_id=h.ink_block_id WHERE h.id=? AND h.workspace_id=?").get(job.input.intakeId,job.workspace_id);
    if(!intake||(!intake.draft&&intake.mode!=="quick"))throw new Error("Pending Draft handwriting intake not found");
    if(intake.ocr_status!=="complete"&&!intake.transcript)throw new Error("Handwriting OCR is not complete");
    const actor={id:null,workspaceId:intake.workspace_id},folderNames=listVaultFolders(intake.vault_source_id,intake.workspace_id,db);
    db.prepare("UPDATE handwriting_intakes SET state='processing',updated_at=? WHERE id=?").run(time,intake.id);
    const routing=intake.mode==="quick"?` Infer a short title and choose destinationFolder from these existing folders: ${folderNames.join(", ")}.`:" Do not change its title or folder.";
    const output=await run({prompt:`Enrich this handwritten note as either a concise summary or a useful expansion. Preserve facts, equations, and uncertainty.${routing}\n\nTitle: ${intake.title}\nTranscript:\n${intake.transcript}`,cwd:resolve(config.jobsDir,job.id),schema,config,profile:job.profile||"fast",workload:"note",onEvent:aiEventHandler(job.id,db)});
    assertNotCancelled(job.id,db);
    const confidence=Number(output.result.confidence),fallback=confidence<.7,destination=intake.mode==="quick"?(fallback?"Captures":String(output.result.destinationFolder||"")):null,cleanTitle=String(output.result.title||"").trim();
    if(intake.mode==="quick"&&!folderNames.includes(destination))throw new Error("AI destination is not an existing vault folder");
    if(intake.mode==="quick"&&(!cleanTitle||/[\\/\0]/.test(cleanTitle)))throw new Error("AI title is invalid");
    if(intake.mode==="quick")moveVaultEntry(intake.vault_source_id,{from:intake.original_path,to:`${destination}/${cleanTitle}.md`},actor,db);
    const blocks=listNoteBlocks(intake.note_id,actor,db),markdown=blocks.find(block=>block.kind==="markdown"),content=`${String(output.result.markdown)}${fallback?"\n\n#needs-filing":""}`,saved=saveMarkdownBlock(intake.note_id,{id:markdown.id,markdown:content,version:markdown.version},actor,db),ordered=[saved.id,intake.ink_block_id,...blocks.filter(block=>![saved.id,intake.ink_block_id].includes(block.id)).map(block=>block.id)];
    reorderNoteBlocks(intake.note_id,{ids:ordered},actor,db);
    const result={action:output.result.action,confidence,provider:output.provider,destinationFolder:destination,title:intake.mode==="quick"?cleanTitle:intake.title};
    db.prepare("UPDATE notes SET draft=0 WHERE id=? AND workspace_id=?").run(intake.note_id,intake.workspace_id);db.prepare("UPDATE captures SET status='confirmed',text=?,updated_at=? WHERE id=? AND workspace_id=?").run(result.title,time,intake.capture_id,intake.workspace_id);db.prepare("UPDATE handwriting_intakes SET state='done',generated_block_id=?,result_json=?,error=NULL,updated_at=? WHERE id=?").run(saved.id,JSON.stringify(result),time,intake.id);finishJob(job.id,{intakeId:intake.id,...result},db);
  }catch(error){db.prepare("UPDATE handwriting_intakes SET state='failed',error=?,updated_at=? WHERE id=?").run(String(error).slice(0,4000),time,job.input.intakeId);failJob(job.id,error,db)}
}
