import {resolve} from "node:path";
import {runAI} from "../ai.mjs";
import {assertNotCancelled,failJob,finishJob} from "../jobs.mjs";
import {completeAutomationSkillStep,failAutomationSkillStep} from "../modules.mjs";
import {buildSkillPrompt,getSkill,skillSchema,workloadForSkill} from "../skills.mjs";
import {selectSkillContext} from "./context.mjs";
import {aiEventHandler} from "./job-events.mjs";

export async function handleRunSkill({job,config,db}){
  const runId=job.input.automationRunId,stepId=job.input.automationRunStepId;
  if(runId){db.prepare("UPDATE automation_runs SET state='running' WHERE id=? AND state IN ('queued','cancelling')").run(runId);db.prepare("UPDATE automation_run_steps SET state='running' WHERE id=? AND state='queued'").run(stepId)}
  try{
    getSkill(job.input.skill);
    const context=selectSkillContext(job.input.input,db,12,job.workspace_id);
    const output=await runAI({prompt:buildSkillPrompt(job.input.skill,job.input.input,JSON.stringify({context})),cwd:resolve(config.jobsDir,job.id),schema:skillSchema,config,workload:workloadForSkill(job.input.skill),search:job.input.skill==="research",onEvent:aiEventHandler(job.id,db)});
    assertNotCancelled(job.id,db);
    const result={skill:job.input.skill,provider:output.provider,...output.result};
    finishJob(job.id,result,db);
    if(runId)completeAutomationSkillStep(runId,stepId,result,db);
  }catch(error){
    failJob(job.id,error,db);
    if(runId){const current=db.prepare("SELECT state,error FROM jobs WHERE id=?").get(job.id),state=current?.state==="cancelled"?"cancelled":current?.state==="queued"?"queued":"failed";if(state!=="queued")failAutomationSkillStep(runId,stepId,state,current?.error||error,db)}
  }
}
