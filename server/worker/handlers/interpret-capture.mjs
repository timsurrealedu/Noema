import {resolve} from "node:path";
import {isTransientAIError,runAI} from "../../ai.mjs";
import {saveInterpretation} from "../../core.mjs";
import {extractStructuredImage,extractText,structuredImageToMarkdown} from "../../extract.mjs";
import {reminderOffsets,getSettings} from "../../settings.mjs";
import {addJobEvent,assertNotCancelled,failJob,finishJob} from "../../jobs.mjs";
import {assetsForCapture} from "../../objects.mjs";
import {listVaultFolders,safeRelativePath} from "../../vault.mjs";

const nullableString={anyOf:[{type:"string"},{type:"null"}]};
const common={id:{type:"string",minLength:1,maxLength:100},confidence:{type:"number",minimum:0,maximum:1},sourceReferences:{type:"array",maxItems:20,items:{type:"string",minLength:1,maxLength:500}}};
export const captureProposalSchema={type:"object",additionalProperties:false,required:["schemaVersion","summary","actions","clarifications"],properties:{schemaVersion:{type:"integer",enum:[1]},summary:{type:"string",minLength:1,maxLength:1000},actions:{type:"array",maxItems:20,items:{oneOf:[
  {type:"object",additionalProperties:false,required:["id","type","confidence","sourceReferences","arguments"],properties:{...common,type:{enum:["task.create"]},arguments:{type:"object",additionalProperties:false,required:["title","dueAt","project","linkedActionId"],properties:{title:{type:"string",minLength:1,maxLength:500},dueAt:nullableString,project:nullableString,linkedActionId:nullableString}}}},
  {type:"object",additionalProperties:false,required:["id","type","confidence","sourceReferences","arguments"],properties:{...common,type:{enum:["event.create"]},arguments:{type:"object",additionalProperties:false,required:["title","startAt","endAt","timezone","location","reminders"],properties:{title:{type:"string",minLength:1,maxLength:500},startAt:{type:"string"},endAt:{type:"string"},timezone:{type:"string",minLength:1,maxLength:100},location:nullableString,reminders:{type:"array",maxItems:10,items:{type:"object",additionalProperties:false,required:["offsetMinutes"],properties:{offsetMinutes:{type:"integer",minimum:0,maximum:525600}}}}}}}},
  {type:"object",additionalProperties:false,required:["id","type","confidence","sourceReferences","arguments"],properties:{...common,type:{enum:["note.create"]},arguments:{type:"object",additionalProperties:false,required:["title","content","tags"],properties:{title:{type:"string",minLength:1,maxLength:500},content:{type:"string",maxLength:100000},tags:{type:"array",maxItems:20,items:{type:"string",maxLength:100}}}}}}
  ,{type:"object",additionalProperties:false,required:["id","type","confidence","sourceReferences","arguments"],properties:{...common,type:{enum:["vault.note.create"]},arguments:{type:"object",additionalProperties:false,required:["sourceId","relativePath","title","content","tags"],properties:{sourceId:{type:"string",minLength:1,maxLength:100},relativePath:{type:"string",minLength:1,maxLength:1000},title:{type:"string",minLength:1,maxLength:500},content:{type:"string",maxLength:100000},tags:{type:"array",maxItems:20,items:{type:"string",maxLength:100}}}}}}
] }},clarifications:{type:"array",maxItems:20,items:{type:"string",minLength:1,maxLength:1000}}}};
export const codexCaptureProposalSchema={type:"object",additionalProperties:false,required:["schemaVersion","summary","actionsJson","clarifications"],properties:{schemaVersion:{type:"integer",enum:[1]},summary:{type:"string"},actionsJson:{type:"string"},clarifications:{type:"array",items:{type:"string"}}}};
export function captureProposalInstructions(reminderOffsets=[60,30]){return `In actions (or actionsJson), return a JSON array of proposed actions. Each item must have id, type, confidence, sourceReferences, and arguments.
- type is exactly task.create, event.create, note.create, or vault.note.create.
- sourceReferences cites only supplied Source IDs (e.g. "capture:<id>" and "vault:<sourceId>").
- task arguments: title, dueAt|null, project|null, linkedActionId|null.
- event arguments: title, startAt, endAt, timezone, location|null, reminders.
- note arguments: title, content, tags.
- vault.note arguments: sourceId, relativePath, title, content, tags.

Interpret every stated clock time in the supplied Time zone and return a full ISO 8601 timestamp with its UTC offset. Use a date-only value (YYYY-MM-DD) only when the capture gives a date but no clock time.

CRITICAL RULES FOR MEETINGS, REMINDERS, AND SCHEDULES:
- Whenever a capture describes a meeting, reminder, appointment, deadline, call, schedule, or day-to-day action item (for example "meeting tomorrow 1 pm", "tomorrow meeting 1 pm", "remind jason to make his job", "call mom at 5pm", "doctor appointment on Friday"):
  ALWAYS emit BOTH a task.create action (so the user gets a checkmarkable task on their task list) AND an event.create action (so it appears on their calendar schedule).
  Set the task's linkedActionId to the event action id so they are linked symmetrically.
  For timed items, default endAt to 60 minutes after startAt. For reminders without an explicit time, schedule them on the appropriate day (or today). For timed events when the user does not specify reminders, use these default reminder offsets in minutes: ${JSON.stringify(reminderOffsets)}.

CRITICAL RULES FOR NOTES AND KNOWLEDGE:
- Whenever a capture represents study notes, lecture sessions, course topics, meeting notes, project ideas, or knowledge (for example "semester 3 mata kuliah network penetration testing first session about information gathering, defining ethical hacking methodology"):
  If a connected vault is available, emit a vault.note.create action with rich, structured Markdown content covering all the key concepts and methodology.
  Follow the Vault note placement rules below adaptively.`}
export function vaultPlacementInstructions(){return `Vault note placement rules:
- The user's vault folder list is supplied below. It reflects their real organization; never assume a fixed structure.
- Intelligently adapt to the existing folder structure:
  - Route the note through existing folders when the topic clearly matches one (for example education under the study/university/college tree, work under the work tree, and so on). Follow the folder hierarchy the user already keeps (e.g. Uni/BINUS, Uni/Binus, College/MIT, Academics, Studies, Kuliah).
  - If no matching parent folder exists in the vault yet, create a logical folder structure based on the capture's domain or mentioned institution (e.g. Uni/Binus, College/MIT, etc.).
  - Extend the hierarchy logically to reflect the structure: <Institution Root>/<Semester>/<Course Name>/<Section or Class>/<Session or Week>/<Note Title>.md (for example: Uni/Binus/Sem3/NetworkPenetrationTesting/Kelas/Session1/Information Gathering and Ethical Hacking Methodology.md, adapting naming style to match existing vault folders).
  - Always give the note a clear, descriptive filename ending in .md based on the specific topic.
  - Generate comprehensive, high quality Markdown note content with headings (# Title, ## ...), bullet points, and key takeaways covering the subject rather than empty placeholders.
  - relativePath must always use forward slashes and end in .md.`}
export function parseActionsJson(value){if(Array.isArray(value))return value;let text=String(value||"").trim();text=text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();const startIdx=text.indexOf("[");if(startIdx<0)throw new Error("actionsJson must contain a JSON array");text=text.slice(startIdx);let depth=0,string=false,escaped=false;for(let index=0;index<text.length;index++){const char=text[index];if(string){if(escaped)escaped=false;else if(char==="\\")escaped=true;else if(char==='"')string=false;continue}if(char==='"')string=true;else if(char==="[")depth++;else if(char==="]"&&!--depth)return JSON.parse(text.slice(0,index+1))}throw new Error("actionsJson is incomplete")}
const validTimezones=new Set(Intl.supportedValuesOf("timeZone"));
export function validateProposal(proposal,sources,vaultSourceIds=null){
  const ids=new Set();
  const rawActions=proposal.actionsJson?parseActionsJson(proposal.actionsJson):proposal.actions;
  if(!Array.isArray(rawActions))throw new Error("Proposal must contain an actions array");
  proposal.actions=rawActions;
  for(const action of proposal.actions){
    if(ids.has(action.id))throw new Error(`Duplicate action id: ${action.id}`);
    ids.add(action.id);
    if(action.sourceReferences.some(reference=>!sources.has(reference)))throw new Error(`Unknown source reference in action: ${action.id}`);
    if(action.type==="event.create"){
      const start=new Date(action.arguments.startAt),end=new Date(action.arguments.endAt);
      if(Number.isNaN(start.valueOf()))throw new Error("Invalid event start time");
      if(Number.isNaN(end.valueOf())||end<=start){action.arguments.endAt=new Date(start.getTime()+3600000).toISOString()}
      if(!validTimezones.has(action.arguments.timezone))action.arguments.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
    }
    if(action.type==="task.create"&&action.arguments.dueAt&&Number.isNaN(new Date(action.arguments.dueAt).valueOf()))throw new Error("Invalid task due time");
    if(action.type==="vault.note.create"){
      if(!action.sourceReferences.includes(`vault:${action.arguments.sourceId}`))throw new Error("Vault note must cite its target vault source");
      if(vaultSourceIds&&!vaultSourceIds.has(action.arguments.sourceId))throw new Error(`Vault note targets unknown vault source: ${action.arguments.sourceId}`);
      try{safeRelativePath(action.arguments.relativePath)}catch{throw new Error("Vault note path is invalid; use Folder/Subfolder/Note Title.md")}
      if(!action.arguments.relativePath.toLowerCase().endsWith(".md"))throw new Error("Vault note path must end in .md");
      if(action.arguments.relativePath.split("/").length>8)throw new Error("Vault note nesting exceeds 8 levels");
    }
  }
  for(const action of proposal.actions){const linked=action.arguments.linkedActionId;if(linked&&!ids.has(linked))action.arguments.linkedActionId=null}
  return proposal;
}

export function vaultFolderContext(vaultTargets,folderIndex,budget=4000){
  const blocks=[];let used=0,truncated=false;
  for(const target of vaultTargets){
    const folders=folderIndex.get(target.id)||[],header=`Source ID: vault:${target.id}\nConnected vault: ${target.name}\nFolders (${folders.length}):`;
    const lines=[header];used+=header.length;
    for(const folder of folders){
      const line=`${folder}/`;
      if(used+line.length+1>budget){truncated=true;break}
      lines.push(line);used+=line.length+1;
    }
    blocks.push(lines.join("\n"));
    if(truncated)break;
  }
  return {text:blocks.join("\n\n"),truncated};
}

export function buildCaptureInput(capture,attachments,budget){
  const primary=`Source ID: capture:${capture.id}\nSource type: ${capture.source}\nCapture:\n${capture.text}`;
  let remaining=budget,primaryText=primary.slice(0,remaining),truncated=primaryText.length<primary.length;
  remaining-=primaryText.length;const parts=[primaryText];
  for(let index=0;index<attachments.length&&remaining>2;index++){
    const allowance=Math.max(0,Math.floor((remaining-2)/(attachments.length-index))),text=attachments[index],chunk=text.slice(0,allowance);
    if(chunk){parts.push(chunk);remaining-=chunk.length+2}if(chunk.length<text.length)truncated=true;
  }
  if(parts.length-1<attachments.length)truncated=true;
  return {text:parts.join("\n\n"),truncated};
}

export async function handleInterpretCapture({job,config,db}){
  try{
    const capture=db.prepare("SELECT text,source FROM captures WHERE id=?").get(job.input.captureId);if(!capture)throw new Error("Capture not found");
    const time=new Date().toISOString();db.prepare("UPDATE jobs SET state='running',updated_at=? WHERE id=?").run(time,job.id);db.prepare("UPDATE captures SET status='processing',updated_at=? WHERE id=?").run(time,job.input.captureId);addJobEvent(job.id,"running",{},db);
    const sources=new Set([`capture:${job.input.captureId}`]),attachments=[];for(const asset of assetsForCapture(job.input.captureId,db)){const source=`asset:${asset.id}`;sources.add(source);
      if(asset.mime.startsWith("image/")){
        const structured=await extractStructuredImage(asset,config).catch(()=>null);
        attachments.push(structured?`Source ${source}: ${asset.name} (read visually with Gemini)\n${structuredImageToMarkdown(structured,asset.name)}`:`Source ${source}: ${asset.name} (${asset.mime}; no text could be extracted)`);
        continue;
      }
      const extracted=await extractText(asset,config).catch(()=>null);attachments.push(extracted?`Source ${source}: ${asset.name} (extracted with ${extracted.tool})\n${extracted.text}`:`Source ${source}: ${asset.name} (${asset.mime}; no deterministic text extraction available)`)}
    const vaultTargets=db.prepare("SELECT id,name,workspace_id FROM vault_sources WHERE workspace_id=? AND state='connected' ORDER BY name").all(job.workspace_id),vaultFolderIndex=new Map(vaultTargets.map(target=>[target.id,listVaultFolders(target.id,target.workspace_id,db)])),{text:vaultContext,truncated:vaultContextTruncated}=vaultFolderContext(vaultTargets,vaultFolderIndex,config.captureMaxVaultFoldersChars||4000);
    for(const target of vaultTargets)sources.add(`vault:${target.id}`);
    const now=new Date().toISOString(),timezone=config.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone,{text:dynamic,truncated}=buildCaptureInput({id:job.input.captureId,...capture},attachments,config.captureMaxInputChars||24000),routing=vaultContext?`A connected vault is available below. Use vault.note.create only for durable knowledge notes, with its sourceId and source reference. Use note.create for local notes. Choose relativePath following the placement rules.\n\n${vaultContext}${vaultContextTruncated?"\n(folder list truncated; prefer folders shown above)":""}\n\n${vaultPlacementInstructions()}\n\n`:"",prompt=`Interpret this Noema capture into proposed actions. Do not perform actions. Preserve the original language. Use ISO 8601 timestamps with offsets and IANA time zones. Every sourceReferences value must use a supplied Source ID. If required scheduling information is ambiguous, add a clarification and omit that action. Return only the required structured result.\n\n${captureProposalInstructions(reminderOffsets(job.input.userId,db))}\n\nCurrent time: ${now}\nTime zone: ${timezone}\n\n${routing}${dynamic}`;
    const isNoteWorkload=capture.source==="file"||capture.text.length>200||/semester|kuliah|session|lecture|chapter|materi|note|summary|catatan|research|modul/i.test(capture.text);
    const maxOutputTokens=isNoteWorkload?Math.max(config.captureMaxOutputTokens||2000,3500):(config.captureMaxOutputTokens||2000);
    const output=await runAI({prompt,cwd:resolve(config.jobsDir,job.id),schema:captureProposalSchema,codexSchema:codexCaptureProposalSchema,geminiSchema:codexCaptureProposalSchema,config,profile:job.input.profile||job.profile||"fast",maxOutputTokens,workload:isNoteWorkload?"note":"schedule",validate:result=>validateProposal(result.actionsJson?{...result,actions:parseActionsJson(result.actionsJson)}:result,sources,new Set(vaultTargets.map(target=>target.id))),onEvent:event=>{assertNotCancelled(job.id,db);addJobEvent(job.id,"ai",{type:event.type,provider:event.provider,model:event.model},db);if(event.type==="provider.completed"||event.type==="provider.failed")db.prepare("INSERT INTO ai_runs(job_id,profile,provider,model,input_tokens,output_tokens,duration_ms,outcome,fallback_reason,truncated,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(job.id,job.input.profile||"fast",event.provider,event.model,event.usage?.inputTokens??null,event.usage?.outputTokens??null,event.durationMs||0,event.type==="provider.completed"?"success":"failed",event.reason||null,truncated?1:0,new Date().toISOString())}});
    assertNotCancelled(job.id,db);const result=output.result;if(truncated)result.clarifications=[...result.clarifications,"Some capture content was omitted from AI processing because it exceeded the configured input limit. Review the original capture before applying."];if(vaultContextTruncated)result.clarifications=[...result.clarifications,"Only part of the vault folder list was shown to the AI; verify the proposed note location before applying."];const proposal=saveInterpretation(job.input.captureId,result,db),captureVersion=db.prepare("SELECT version FROM captures WHERE id=?").get(job.input.captureId).version;finishJob(job.id,{provider:output.provider,model:output.model,durationMs:output.durationMs,truncated,captureVersion,...proposal},db);
    // Optional auto-apply (F5.3): only for trusted patterns — every action confident and nothing ambiguous.
    try{
      const userId=job.input.userId||db.prepare("SELECT user_id FROM workspace_members WHERE workspace_id=? AND revoked_at IS NULL LIMIT 1").get(job.workspace_id)?.user_id;
      const autoApply=userId&&getSettings(userId,db).preferences.autoApplyCaptures;
      const trustworthy=proposal.actions?.length&&!result.clarifications.length&&result.actions.every(action=>action.confidence>=0.8);
      if(autoApply&&trustworthy){const {applyCaptureInterpretation}=await import("../../core.mjs");applyCaptureInterpretation(job.input.captureId,db,{id:userId,workspaceId:job.workspace_id})}
    }catch{/* auto-apply is best-effort; the proposal remains reviewable */}
  }catch(error){if(!isTransientAIError(error))db.prepare("UPDATE jobs SET max_attempts=attempts+1 WHERE id=?").run(job.id);failJob(job.id,error,db);const state=db.prepare("SELECT state FROM jobs WHERE id=?").get(job.id)?.state;if(state!=="queued")db.prepare("UPDATE captures SET status='failed',error=?,updated_at=? WHERE id=?").run(String(error).slice(0,1000),new Date().toISOString(),job.input.captureId)}
}
