import {resolve} from "node:path";
import {getDatabase} from "./db.mjs";
import {ensureDataDirs,loadConfig} from "./config.mjs";
import {runAI} from "./ai.mjs";
import {addJobEvent,assertNotCancelled,claimJob,failJob,finishJob} from "./jobs.mjs";
import {failNoteOptimization,finishNoteOptimization,saveInterpretation} from "./core.mjs";
import {extractText} from "./extract.mjs";
import {assetsForCapture} from "./objects.mjs";
import {buildSkillPrompt,getSkill,skillSchema,workloadForSkill} from "./skills.mjs";
import {deliverDueReminders,runScheduledAutomations} from "./modules.mjs";

const schema={type:"object",additionalProperties:false,required:["objects"],properties:{objects:{type:"array",maxItems:20,items:{type:"object",additionalProperties:false,required:["type","title","detail"],properties:{type:{enum:["task","event","note"]},title:{type:"string",minLength:1,maxLength:500},detail:{type:"string",maxLength:1000}}}}}};
const optimizationSchema={type:"object",additionalProperties:false,required:["content","summary"],properties:{content:{type:"string",minLength:1,maxLength:100000},summary:{type:"string",minLength:1,maxLength:2000}}};

export async function runOne(config=ensureDataDirs(loadConfig()),db=getDatabase(config)){
  deliverDueReminders(new Date(),db);
  runScheduledAutomations(new Date(),db);
  const job=claimJob(["interpret-capture","skill-run","note-optimize"],120,db);if(!job)return false;
  try{assertNotCancelled(job.id,db)}catch(error){failJob(job.id,error,db);return true}
  if(job.kind==="note-optimize")try{const note=db.prepare("SELECT title,content FROM notes WHERE id=? AND draft=1 AND trashed=0").get(job.input.noteId);if(!note)throw new Error("Draft note not found");const instructions={light:"Fix grammar and formatting only.",organize:"Improve headings, order, and readability.",study:"Turn this into clear study notes with summaries and examples.",technical:"Improve technical structure and precision.",voice:"Preserve the author's voice while improving clarity."}[job.input.mode];const output=await runAI({prompt:`Optimize this Draft note. ${instructions} Preserve facts and meaning. Return the complete replacement Markdown and a concise change summary.\n\nTitle: ${note.title}\n\n${note.content}`,cwd:resolve(config.jobsDir,job.id),schema:optimizationSchema,config,workload:"note",onEvent:event=>{assertNotCancelled(job.id,db);addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)}});assertNotCancelled(job.id,db);finishNoteOptimization(job.input.optimizationId,output.result,output.provider,db);finishJob(job.id,{optimizationId:job.input.optimizationId,provider:output.provider},db);return true}catch(error){failNoteOptimization(job.input.optimizationId,error,db);failJob(job.id,error,db);return true}
  if(job.kind==="skill-run")try{getSkill(job.input.skill);const state={tasks:db.prepare("SELECT title,project,due,completed FROM tasks WHERE archived=0 LIMIT 100").all(),notes:db.prepare("SELECT title,excerpt,tags_json FROM notes WHERE trashed=0 LIMIT 100").all(),captures:db.prepare("SELECT text,source,status FROM captures LIMIT 100").all()};const output=await runAI({prompt:buildSkillPrompt(job.input.skill,job.input.input,JSON.stringify(state)),cwd:resolve(config.jobsDir,job.id),schema:skillSchema,config,workload:workloadForSkill(job.input.skill),search:job.input.skill==="research",onEvent:event=>{assertNotCancelled(job.id,db);addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)}});assertNotCancelled(job.id,db);finishJob(job.id,{skill:job.input.skill,provider:output.provider,...output.result},db);return true}catch(error){failJob(job.id,error,db);return true}
  try{const capture=db.prepare("SELECT text,source FROM captures WHERE id=?").get(job.input.captureId);if(!capture)throw new Error("Capture not found");db.prepare("UPDATE jobs SET state='running',updated_at=? WHERE id=?").run(new Date().toISOString(),job.id);db.prepare("UPDATE captures SET status='processing',updated_at=? WHERE id=?").run(new Date().toISOString(),job.input.captureId);addJobEvent(job.id,"running",{},db);
    const assets=assetsForCapture(job.input.captureId,db),attachments=[];
    for(const asset of assets){const extracted=await extractText(asset,config).catch(()=>null);attachments.push(extracted?`Attachment: ${asset.name} (extracted with ${extracted.tool})\n${extracted.text}`:`Attachment: ${asset.name} (${asset.mime}; no deterministic text extraction available)`);}
    const prompt=`Interpret this LifeOS capture into proposed tasks, events, or notes. Do not perform actions. Preserve the original language. Return only the required structured result.\n\nSource: ${capture.source}\nCapture:\n${capture.text}${attachments.length?`\n\n${attachments.join("\n\n")}`:""}`;
    const output=await runAI({prompt,cwd:resolve(config.jobsDir,job.id),schema,config,workload:capture.source==="file"||capture.text.length>1000?"note":"task",onEvent:event=>{assertNotCancelled(job.id,db);addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)}});assertNotCancelled(job.id,db);const objects=saveInterpretation(job.input.captureId,output.result.objects,db);finishJob(job.id,{provider:output.provider,objects},db);return true;
  }catch(error){db.prepare("UPDATE captures SET status='failed',error=?,updated_at=? WHERE id=?").run(String(error).slice(0,1000),new Date().toISOString(),job.input.captureId);failJob(job.id,error,db);return true}
}

export async function startWorker(){const config=ensureDataDirs(loadConfig());for(;;){if(!await runOne(config))await new Promise(resolvePromise=>setTimeout(resolvePromise,1000))}}

if(import.meta.url===`file://${process.argv[1]}`)startWorker().catch(error=>{console.error(error);process.exitCode=1});
