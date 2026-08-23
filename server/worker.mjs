import {getDatabase} from "./db.mjs";
import {ensureDataDirs,loadConfig} from "./config.mjs";
import {assertNotCancelled,claimJob,failJob} from "./jobs.mjs";
import {failAutomationSkillStep} from "./modules.mjs";
import {processClaimedJob} from "./worker/dispatch.mjs";
import {runScheduledWork} from "./worker/maintenance/index.mjs";

export async function runOne(config=ensureDataDirs(loadConfig()),db=getDatabase(config)){
  const pushed=await runScheduledWork(config,db);
  const job=claimJob(["interpret-capture","skill-run","note-optimize","handwriting-ocr","handwriting-intake","continue-math","transcribe-audio"],120,db);if(!job)return pushed;
  try{assertNotCancelled(job.id,db)}catch(error){failJob(job.id,error,db);if(job.input.automationRunId)failAutomationSkillStep(job.input.automationRunId,job.input.automationRunStepId,"cancelled",null,db);return true}
  await processClaimedJob({job,config,db});return true;
}

export async function startWorker(){const config=ensureDataDirs(loadConfig());console.info(`[worker] started; polling every ${config.workerPollMs}ms`);for(;;){if(!await runOne(config))await new Promise(resolvePromise=>setTimeout(resolvePromise,config.workerPollMs))}}

if(import.meta.url===`file://${process.argv[1]}`)startWorker().catch(error=>{console.error(error);process.exitCode=1});
