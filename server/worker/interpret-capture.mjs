import {resolve} from "node:path";
import {runAI} from "../ai.mjs";
import {saveInterpretation} from "../core.mjs";
import {extractText} from "../extract.mjs";
import {addJobEvent,assertNotCancelled,failJob,finishJob} from "../jobs.mjs";
import {assetsForCapture} from "../objects.mjs";

const nullableString={anyOf:[{type:"string"},{type:"null"}]};
const common={id:{type:"string",minLength:1,maxLength:100},confidence:{type:"number",minimum:0,maximum:1},sourceReferences:{type:"array",maxItems:20,items:{type:"string",minLength:1,maxLength:500}}};
export const captureProposalSchema={type:"object",additionalProperties:false,required:["schemaVersion","summary","actions","clarifications"],properties:{schemaVersion:{enum:[1]},summary:{type:"string",minLength:1,maxLength:1000},actions:{type:"array",maxItems:20,items:{oneOf:[
  {type:"object",additionalProperties:false,required:["id","type","confidence","sourceReferences","arguments"],properties:{...common,type:{enum:["task.create"]},arguments:{type:"object",additionalProperties:false,required:["title","dueAt","project","linkedActionId"],properties:{title:{type:"string",minLength:1,maxLength:500},dueAt:nullableString,project:nullableString,linkedActionId:nullableString}}}},
  {type:"object",additionalProperties:false,required:["id","type","confidence","sourceReferences","arguments"],properties:{...common,type:{enum:["event.create"]},arguments:{type:"object",additionalProperties:false,required:["title","startAt","endAt","timezone","location","reminders"],properties:{title:{type:"string",minLength:1,maxLength:500},startAt:{type:"string"},endAt:{type:"string"},timezone:{type:"string",minLength:1,maxLength:100},location:nullableString,reminders:{type:"array",maxItems:10,items:{type:"object",additionalProperties:false,required:["offsetMinutes"],properties:{offsetMinutes:{type:"integer",minimum:0,maximum:525600}}}}}}}},
  {type:"object",additionalProperties:false,required:["id","type","confidence","sourceReferences","arguments"],properties:{...common,type:{enum:["note.create"]},arguments:{type:"object",additionalProperties:false,required:["title","content","tags"],properties:{title:{type:"string",minLength:1,maxLength:500},content:{type:"string",maxLength:100000},tags:{type:"array",maxItems:20,items:{type:"string",maxLength:100}}}}}}
] }},clarifications:{type:"array",maxItems:20,items:{type:"string",minLength:1,maxLength:1000}}}};
const actionDetail=(type,args)=>{if(type==="event")return `${args.startAt} · ${args.timezone}`;if(type==="task")return args.dueAt||args.project||"No due date";return (args.content||"").slice(0,140)};

export async function handleInterpretCapture({job,config,db}){
  try{
    const capture=db.prepare("SELECT text,source FROM captures WHERE id=?").get(job.input.captureId);if(!capture)throw new Error("Capture not found");
    const time=new Date().toISOString();db.prepare("UPDATE jobs SET state='running',updated_at=? WHERE id=?").run(time,job.id);db.prepare("UPDATE captures SET status='processing',updated_at=? WHERE id=?").run(time,job.input.captureId);addJobEvent(job.id,"running",{},db);
    const attachments=[];for(const asset of assetsForCapture(job.input.captureId,db)){const extracted=await extractText(asset,config).catch(()=>null);attachments.push(extracted?`Attachment: ${asset.name} (extracted with ${extracted.tool})\n${extracted.text}`:`Attachment: ${asset.name} (${asset.mime}; no deterministic text extraction available)`)}
    const now=new Date().toISOString(),timezone=config.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
    const attachmentText=attachments.length?`\n\n${attachments.join("\n\n")}`:"",prompt=`Interpret this Noema capture into proposed actions. Do not perform actions. Preserve the original language. Use ISO 8601 timestamps with offsets. If required scheduling information is ambiguous, add a clarification and omit that action. Return only the required structured result.\n\nCurrent time: ${now}\nTime zone: ${timezone}\nSource: ${capture.source}\nCapture:\n${capture.text}${attachmentText}`;
    const output=await runAI({prompt,cwd:resolve(config.jobsDir,job.id),schema:captureProposalSchema,config,workload:capture.source==="file"||capture.text.length>1000?"note":"schedule",onEvent:event=>{assertNotCancelled(job.id,db);addJobEvent(job.id,"ai",{type:event.type,provider:event.provider},db)}});
    assertNotCancelled(job.id,db);const proposal=saveInterpretation(job.input.captureId,output.result,db),objects=proposal.actions.map(action=>{const type=action.type.split(".")[0],args=action.arguments;return {...action,type,title:args.title,detail:actionDetail(type,args)}});finishJob(job.id,{provider:output.provider,...proposal,objects},db);
  }catch(error){db.prepare("UPDATE captures SET status='failed',error=?,updated_at=? WHERE id=?").run(String(error).slice(0,1000),new Date().toISOString(),job.input.captureId);failJob(job.id,error,db)}
}
