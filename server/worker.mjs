import {resolve} from "node:path";
import {getDatabase} from "./db.mjs";
import {ensureDataDirs,loadConfig} from "./config.mjs";
import {runAI} from "./ai.mjs";
import {addJobEvent,assertNotCancelled,claimJob,failJob,finishJob} from "./jobs.mjs";
import {failNoteOptimization,finishNoteOptimization} from "./core.mjs";
import {handleInterpretCapture} from "./worker/interpret-capture.mjs";
import {buildSkillPrompt,getSkill,skillSchema,workloadForSkill} from "./skills.mjs";
import {completeAutomationSkillStep,deliverDueReminders,failAutomationSkillStep,runScheduledAutomations} from "./modules.mjs";
import {deliverOne} from "./push.mjs";

const optimizationSchema={type:"object",additionalProperties:false,required:["content","summary"],properties:{content:{type:"string",minLength:1,maxLength:100000},summary:{type:"string",minLength:1,maxLength:2000}}};

export async function runOne(config=ensureDataDirs(loadConfig()),db=getDatabase(config)){
  deliverDueReminders(new Date(),db);
  runScheduledAutomations(new Date(),db);
  const pushed=await deliverOne(config,db);
  const job=claimJob(["interpret-capture","skill-run","note-optimize"],120,db);if(!job)return pushed;
  try{assertNotCancelled(job.id,db)}catch(error){failJob(job.id,error,db);if(job.input.automationRunId)failAutomationSkillStep(job.input.automationRunId,job.input.automationRunStepId,"cancelled",null,db);return true}
  if(job.kind==="note-optimize")try{const note=db.prepare("SELECT title,content FROM notes WHERE id=? AND draft=1 AND trashed=0").get(job.input.noteId);if(!note)throw new Error("Draft note not found");const instructions={light:"Fix grammar and formatting only.",organize:"Improve headings, order, and readability.",study:"Turn this into clear study notes with summaries and examples.",technical:"Improve technical structure and precision.",voice:"Preserve the author's voice while improving clarity."}[job.input.mode];const output=await runAI({prompt:`Optimize this Draft note. ${instructions} Preserve facts and meaning. Return the complete replacement Markdown and a concise change summary.\n\nTitle: ${note.title}\n\n${note.content}`,cwd:resolve(config.jobsDir,job.id),schema:optimizationSchema,config,workload:"note",onEvent:event=>{assertNotCancelled(job.id,db);addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)}});assertNotCancelled(job.id,db);finishNoteOptimization(job.input.optimizationId,output.result,output.provider,db);finishJob(job.id,{optimizationId:job.input.optimizationId,provider:output.provider},db);return true}catch(error){failNoteOptimization(job.input.optimizationId,error,db);failJob(job.id,error,db);return true}
  if(job.kind==="skill-run"){const automationRunId=job.input.automationRunId;if(automationRunId){db.prepare("UPDATE automation_runs SET state='running' WHERE id=? AND state IN ('queued','cancelling')").run(automationRunId);db.prepare("UPDATE automation_run_steps SET state='running' WHERE id=? AND state='queued'").run(job.input.automationRunStepId)}try{getSkill(job.input.skill);const state={tasks:db.prepare("SELECT title,project,due,completed FROM tasks WHERE archived=0 LIMIT 100").all(),notes:db.prepare("SELECT title,excerpt,tags_json FROM notes WHERE trashed=0 LIMIT 100").all(),captures:db.prepare("SELECT text,source,status FROM captures LIMIT 100").all()};const output=await runAI({prompt:buildSkillPrompt(job.input.skill,job.input.input,JSON.stringify(state)),cwd:resolve(config.jobsDir,job.id),schema:skillSchema,config,workload:workloadForSkill(job.input.skill),search:job.input.skill==="research",onEvent:event=>{assertNotCancelled(job.id,db);addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)}});assertNotCancelled(job.id,db);const result={skill:job.input.skill,provider:output.provider,...output.result};finishJob(job.id,result,db);if(automationRunId)completeAutomationSkillStep(automationRunId,job.input.automationRunStepId,result,db);return true}catch(error){failJob(job.id,error,db);if(automationRunId){const current=db.prepare("SELECT state,error FROM jobs WHERE id=?").get(job.id),state=current?.state==="cancelled"?"cancelled":current?.state==="queued"?"queued":"failed";if(state!=="queued")failAutomationSkillStep(automationRunId,job.input.automationRunStepId,state,current?.error||error,db)}return true}}
  return handleInterpretCapture({job,config,db});
}

export async function startWorker(){const config=ensureDataDirs(loadConfig());for(;;){if(!await runOne(config))await new Promise(resolvePromise=>setTimeout(resolvePromise,1000))}}

if(import.meta.url===`file://${process.argv[1]}`)startWorker().catch(error=>{console.error(error);process.exitCode=1});
