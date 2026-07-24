import {resolve} from "node:path";
import {getDatabase} from "./db.mjs";
import {ensureDataDirs,loadConfig} from "./config.mjs";
import {runAI} from "./ai.mjs";
import {addJobEvent,claimJob,failJob,finishJob} from "./jobs.mjs";
import {saveInterpretation} from "./core.mjs";
import {buildSkillPrompt,getSkill,skillSchema,workloadForSkill} from "./skills.mjs";

const schema={type:"object",additionalProperties:false,required:["objects"],properties:{objects:{type:"array",maxItems:20,items:{type:"object",additionalProperties:false,required:["type","title","detail"],properties:{type:{enum:["task","event","note"]},title:{type:"string",minLength:1,maxLength:500},detail:{type:"string",maxLength:1000}}}}}};

export async function runOne(config=ensureDataDirs(loadConfig()),db=getDatabase(config)){
  const job=claimJob(["interpret-capture","skill-run"],120,db);if(!job)return false;
  if(job.kind==="skill-run")try{getSkill(job.input.skill);const state={tasks:db.prepare("SELECT title,project,due,completed FROM tasks WHERE archived=0 LIMIT 100").all(),notes:db.prepare("SELECT title,excerpt,tags_json FROM notes WHERE trashed=0 LIMIT 100").all(),captures:db.prepare("SELECT text,source,status FROM captures LIMIT 100").all()};const output=await runAI({prompt:buildSkillPrompt(job.input.skill,job.input.input,JSON.stringify(state)),cwd:resolve(config.jobsDir,job.id),schema:skillSchema,config,workload:workloadForSkill(job.input.skill),search:job.input.skill==="research",onEvent:event=>addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)});finishJob(job.id,{skill:job.input.skill,provider:output.provider,...output.result},db);return true}catch(error){failJob(job.id,error,db);return true}
  try{const capture=db.prepare("SELECT text,source FROM captures WHERE id=?").get(job.input.captureId);if(!capture)throw new Error("Capture not found");db.prepare("UPDATE jobs SET state='running',updated_at=? WHERE id=?").run(new Date().toISOString(),job.id);db.prepare("UPDATE captures SET status='processing',updated_at=? WHERE id=?").run(new Date().toISOString(),job.input.captureId);addJobEvent(job.id,"running",{},db);
    const prompt=`Interpret this LifeOS capture into proposed tasks, events, or notes. Do not perform actions. Preserve the original language. Return only the required structured result.\n\nSource: ${capture.source}\nCapture:\n${capture.text}`;
    const output=await runAI({prompt,cwd:resolve(config.jobsDir,job.id),schema,config,workload:capture.source==="file"||capture.text.length>1000?"note":"task",onEvent:event=>addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)});const objects=saveInterpretation(job.input.captureId,output.result.objects,db);finishJob(job.id,{provider:output.provider,objects},db);return true;
  }catch(error){db.prepare("UPDATE captures SET status='failed',error=?,updated_at=? WHERE id=?").run(String(error).slice(0,1000),new Date().toISOString(),job.input.captureId);failJob(job.id,error,db);return true}
}

export async function startWorker(){const config=ensureDataDirs(loadConfig());for(;;){if(!await runOne(config))await new Promise(resolvePromise=>setTimeout(resolvePromise,1000))}}

if(import.meta.url===`file://${process.argv[1]}`)startWorker().catch(error=>{console.error(error);process.exitCode=1});
