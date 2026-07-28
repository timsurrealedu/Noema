import {createHash,randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {runCaptureAutomations} from "./modules.mjs";
import {assetsForCapture,attachAssets,getAsset,storeAsset} from "./objects.mjs";
import {loadConfig} from "./config.mjs";
import {enqueueJob} from "./jobs.mjs";
import {recordConflict} from "./collaboration.mjs";

const stamp=()=>new Date().toISOString();
const formatSize=bytes=>bytes>1024*1024?`${(bytes/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
const fileKind=type=>type?.startsWith("image/")?"Image":type?.startsWith("audio/")?"Audio":type?.startsWith("text/")?"Text":type==="application/pdf"?"Document":type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"?"Document":"File";
const parse=value=>{try{return JSON.parse(value)}catch{return []}};
const captureObjects=value=>{const parsed=parse(value),actions=Array.isArray(parsed)?parsed:parsed.actions||[];return actions.map(action=>{if(!action.type.includes(".")){return action}const type=action.type.split(".")[0],args=action.arguments;return {...action,type,title:args.title,detail:type==="event"?`${args.startAt} · ${args.timezone}`:type==="task"?(args.dueAt||args.project||"No due date"):(args.content||"").slice(0,140)}})};
const required=(value,name,max=10000)=>{if(typeof value!=="string"||!value.trim())throw new Error(`${name} is required`);if(value.length>max)throw new Error(`${name} is too long`);return value.trim()};
const timestamp=value=>{if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new Error("reminderAt must be a valid date");return date.toISOString()};
const absolute=(value,name)=>{const date=new Date(value);if(Number.isNaN(date.getTime()))throw new Error(`${name} must be a valid date`);return date};
const eventPosition=(date,timezone)=>{let parts;try{parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:timezone,weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date).map(part=>[part.type,part.value]))}catch{throw new Error("timezone must be a valid IANA time zone")}return {day:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(parts.weekday),time:`${parts.hour}:${parts.minute}`}};
const eventRow=row=>({...row,active:!!row.active,allDay:!!row.all_day,reminderAt:row.reminder_at,startAt:row.start_at,endAt:row.end_at,recurrence:row.recurrence_json?parse(row.recurrence_json):null,deletedAt:row.deleted_at});
const queueCalendarWrite=(db,row,operation,actor,calendarId)=>{if(!actor)return;let mapping=db.prepare("SELECT * FROM calendar_event_mappings WHERE local_event_id=?").get(row.id);if(!mapping&&calendarId){const calendar=db.prepare("SELECT c.account_id FROM google_calendars c JOIN google_accounts a ON a.id=c.account_id WHERE a.user_id=? AND c.calendar_id=? AND c.selected=1").get(actor,calendarId);if(!calendar)throw new Error("Select a valid Google calendar");const id=randomUUID(),googleId=createHash("sha256").update(row.id).digest("hex").slice(0,32);db.prepare("INSERT INTO calendar_event_mappings(id,account_id,calendar_id,local_event_id,google_event_id,last_local_version,google_snapshot_json,last_synced_at) VALUES(?,?,?,?,?,?,?,?)").run(id,calendar.account_id,calendarId,row.id,googleId,0,"{}",stamp());mapping={id}}if(mapping){const time=stamp();db.prepare("INSERT OR IGNORE INTO calendar_sync_writes(id,mapping_id,operation,payload_json,local_version,next_attempt_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(randomUUID(),mapping.id,operation,JSON.stringify(row),row.version,time,time,time)}};
const actorInfo=actor=>typeof actor==="object"&&actor?{id:actor.id||null,workspaceId:actor.workspaceId||actor.workspace?.id||null}:{id:actor||null,workspaceId:null};
const findOwned=(db,table,id,workspaceId,extra="")=>{const row=workspaceId?db.prepare(`SELECT * FROM ${table} WHERE id=? AND workspace_id=? ${extra}`).get(id,workspaceId):db.prepare(`SELECT * FROM ${table} WHERE id=? ${extra}`).get(id);if(!row&&workspaceId&&db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id))throw Object.assign(new Error(`${table.slice(0,-1)} not found`),{status:404});return row};
const requireVersion=(input,before,{db,type,actor}={})=>{if(before&&input.version!==before.version){const context=actorInfo(actor),conflict=context.workspaceId&&context.id?recordConflict(context.workspaceId,context.id,type,before.id,Number(input.version)||0,before,input,db):null;throw Object.assign(new Error(`Expected version ${before.version}`),{status:409,code:"VERSION_CONFLICT",conflictId:conflict?.id})}};
const audit=(db,action,type,id,summary,inverse=null,actor=null)=>{const context=actorInfo(actor);db.prepare("INSERT INTO audit_events(id,actor_id,action,object_type,object_id,summary,inverse_json,workspace_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)").run(randomUUID(),context.id,action,type,id,summary,inverse?JSON.stringify(inverse):null,context.workspaceId,stamp())};
const objectTables={task:"tasks",event:"events",note:"notes",capture:"captures",project:"projects"};
const insertRow=(db,table,row)=>{const columns=Object.keys(row);db.prepare(`INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(()=>"?").join(",")})`).run(...columns.map(column=>row[column]))};
const deleteObject=(db,type,id)=>{db.prepare(`DELETE FROM ${objectTables[type]} WHERE id=?`).run(id);if(type==="note")db.prepare("DELETE FROM notes_fts WHERE id=?").run(id)};
const reindexNote=(db,row)=>{db.prepare("DELETE FROM notes_fts WHERE id=?").run(row.id);db.prepare("INSERT INTO notes_fts(id,title,content,tags) VALUES(?,?,?,?)").run(row.id,row.title,row.content,parse(row.tags_json).join(" "))};

export function listState(db=getDatabase(),workspaceId=null){const filter=workspaceId?" WHERE workspace_id=?":"",args=workspaceId?[workspaceId]:[];
  return {
    tasks:db.prepare(`SELECT * FROM tasks${filter} ORDER BY created_at DESC`).all(...args).map(row=>({...row,completed:!!row.completed,archived:!!row.archived,reminderAt:row.reminder_at,subtasks:parse(row.subtasks_json)})),
    events:db.prepare(`SELECT * FROM events WHERE deleted_at IS NULL${workspaceId?" AND workspace_id=?":""} ORDER BY start_at`).all(...args).map(eventRow),
    notes:db.prepare(`SELECT * FROM notes${filter} ORDER BY updated_at DESC`).all(...args).map(row=>({...row,ai:!!row.ai,draft:!!row.draft,favorite:!!row.favorite,trashed:!!row.trashed,tags:parse(row.tags_json),time:row.updated_at})),
    captures:db.prepare(`SELECT * FROM captures${filter} ORDER BY created_at DESC`).all(...args).map(row=>({id:row.id,text:row.text,source:row.source,status:row.status,sourceLabel:row.source_label,objects:captureObjects(row.objects_json),error:row.error,assets:assetsForCapture(row.id,db,workspaceId).map(asset=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size})),createdAt:row.created_at,version:row.version})),
    projects:db.prepare(`SELECT * FROM projects${filter} ORDER BY name`).all(...args),
    taskDependencies:db.prepare(`SELECT d.task_id AS taskId,d.depends_on_task_id AS dependsOnTaskId,d.created_at AS createdAt FROM task_dependencies d JOIN tasks t ON t.id=d.task_id${workspaceId?" WHERE t.workspace_id=?":""}`).all(...args),
    noteLinks:db.prepare(`SELECT l.source_note_id AS sourceNoteId,l.target_note_id AS targetNoteId,l.link_text AS linkText,l.created_at AS createdAt FROM note_links l JOIN notes n ON n.id=l.source_note_id${workspaceId?" WHERE n.workspace_id=?":""}`).all(...args),
  };
}

export function saveTask(input,db=getDatabase(),actor=null){
  const context=actorInfo(actor),id=input.id||randomUUID(),title=required(input.title,"title",500),project=required(input.project||"Inbox","project",200),due=required(input.due||"No date","due",100),priority=["High","Medium","Low"].includes(input.priority)?input.priority:"Medium",time=stamp(),before=findOwned(db,"tasks",id,context.workspaceId);
  requireVersion(input,before,{db,type:"task",actor});
  const reminderAt=timestamp(input.reminderAt);db.prepare(`INSERT INTO tasks(id,title,project,due,priority,completed,recurrence,subtasks_json,archived,reminder_at,created_at,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,project=excluded.project,due=excluded.due,priority=excluded.priority,completed=excluded.completed,recurrence=excluded.recurrence,subtasks_json=excluded.subtasks_json,archived=excluded.archived,reminder_sent_at=CASE WHEN tasks.reminder_at IS excluded.reminder_at THEN tasks.reminder_sent_at ELSE NULL END,reminder_at=excluded.reminder_at,updated_at=excluded.updated_at,version=tasks.version+1`).run(id,title,project,due,priority,input.completed?1:0,input.recurrence||null,JSON.stringify(input.subtasks||[]),input.archived?1:0,reminderAt,before?.created_at||time,time,context.workspaceId);
  audit(db,before?"update":"create","task",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);return findOwned(db,"tasks",id,context.workspaceId);
}

export function saveEvent(input,db=getDatabase(),actor=null,options={}){
  const context=actorInfo(actor),id=input.id||randomUUID(),title=required(input.title,"title",500),now=stamp(),before=findOwned(db,"events",id,context.workspaceId),timezone=required(input.timezone||before?.timezone||"UTC","timezone",100),legacyDay=Number(input.day),legacyTime=String(input.time||"09:00");
  if(input.googleCalendarId&&context.id&&!db.prepare("SELECT 1 FROM google_calendars c JOIN google_accounts a ON a.id=c.account_id WHERE a.user_id=? AND c.calendar_id=? AND c.selected=1").get(context.id,input.googleCalendarId))throw new Error("Select a valid Google calendar");
  requireVersion(input,before,{db,type:"event",actor});
  let start;if(input.startAt)start=absolute(input.startAt,"startAt");else{if(!Number.isInteger(legacyDay)||legacyDay<0||legacyDay>6||!/^\d{2}:\d{2}$/.test(legacyTime))throw new Error("A valid startAt or legacy day/time is required");const date=new Date(),monday=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-((date.getUTCDay()+6)%7))),[hour,minute]=legacyTime.split(":").map(Number);start=new Date(monday);start.setUTCDate(start.getUTCDate()+legacyDay);start.setUTCHours(hour,minute,0,0)}
  const end=input.endAt?absolute(input.endAt,"endAt"):new Date(start.getTime()+Math.max(15,Math.round((Number(input.height)||58)/0.85))*60000);if(end<=start)throw new Error("endAt must be after startAt");
  const {day,time:timeValue}=eventPosition(start,timezone),height=Math.max(15,(end-start)/60000)*0.85,recurrence=input.recurrence==null?null:JSON.stringify(input.recurrence),reminderAt=timestamp(input.reminderAt);
  db.prepare(`INSERT INTO events(id,title,day,time,top,height,location,active,reminder_at,start_at,end_at,timezone,all_day,recurrence_json,deleted_at,created_at,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,day=excluded.day,time=excluded.time,top=excluded.top,height=excluded.height,location=excluded.location,active=excluded.active,reminder_sent_at=CASE WHEN events.reminder_at IS excluded.reminder_at THEN events.reminder_sent_at ELSE NULL END,reminder_at=excluded.reminder_at,start_at=excluded.start_at,end_at=excluded.end_at,timezone=excluded.timezone,all_day=excluded.all_day,recurrence_json=excluded.recurrence_json,deleted_at=NULL,updated_at=excluded.updated_at,version=events.version+1`).run(id,title,day,timeValue,Number(input.top)||0,height,input.location||null,input.active?1:0,reminderAt,start.toISOString(),end.toISOString(),timezone,input.allDay?1:0,recurrence,null,before?.created_at||now,now,context.workspaceId);
  const saved=eventRow(findOwned(db,"events",id,context.workspaceId));audit(db,before?"update":"create","event",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);if(!options.skipCalendarSync)queueCalendarWrite(db,saved,before?"update":"create",context.id,input.googleCalendarId);return saved;
}

export function deleteEvent(id,version,db=getDatabase(),actor=null,options={}){const context=actorInfo(actor),before=findOwned(db,"events",id,context.workspaceId,"AND deleted_at IS NULL");if(!before)throw Object.assign(new Error("Event not found"),{status:404});requireVersion({version},before,{db,type:"event",actor});const time=stamp();db.prepare(`UPDATE events SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?${context.workspaceId?" AND workspace_id=?":""}`).run(time,time,id,...(context.workspaceId?[context.workspaceId]:[]));const row=findOwned(db,"events",id,context.workspaceId);audit(db,"delete","event",id,before.title,{op:"restore",row:before},actor);if(!options.skipCalendarSync)queueCalendarWrite(db,row,"delete",context.id);return {ok:true,deletedAt:time,version:before.version+1}}

export function saveNote(input,db=getDatabase(),actor=null){
  const context=actorInfo(actor),id=input.id||randomUUID(),title=required(input.title,"title",500),content=String(input.content||""),time=stamp(),before=findOwned(db,"notes",id,context.workspaceId),excerpt=String(input.excerpt||content.replace(/[#*_>-]/g,"").trim().slice(0,140));
  requireVersion(input,before,{db,type:"note",actor});
  db.prepare(`INSERT INTO notes(id,title,excerpt,content,tags_json,ai,draft,source,favorite,trashed,created_at,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,tags_json=excluded.tags_json,ai=excluded.ai,draft=excluded.draft,source=excluded.source,favorite=excluded.favorite,trashed=excluded.trashed,updated_at=excluded.updated_at,version=notes.version+1`).run(id,title,excerpt,content,JSON.stringify(input.tags||[]),input.ai?1:0,input.draft?1:0,input.source||null,input.favorite?1:0,input.trashed?1:0,before?.created_at||time,time,context.workspaceId);
  db.prepare("DELETE FROM notes_fts WHERE id=?").run(id);db.prepare("INSERT INTO notes_fts(id,title,content,tags) VALUES(?,?,?,?)").run(id,title,content,(input.tags||[]).join(" "));
  reindexNoteLinks(id,content,db,context.workspaceId);
  const saved=findOwned(db,"notes",id,context.workspaceId);db.prepare("INSERT INTO note_versions(note_id,version,title,content,tags_json,created_at) VALUES(?,?,?,?,?,?)").run(id,saved.version,title,content,saved.tags_json,time);
  audit(db,before?"update":"create","note",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);return saved;
}

export function createCapture(input,db=getDatabase(),actor=null){
  const context=actorInfo(actor),id=input.id||randomUUID(),text=required(input.text,"text",50000),source=["typed","voice","file","link"].includes(input.source)?input.source:"typed",time=stamp();
  if(findOwned(db,"captures",id,context.workspaceId))throw Object.assign(new Error("Capture already exists"),{status:409});for(const assetId of (Array.isArray(input.assetIds)?input.assetIds:[]).slice(0,10))if(!getAsset(String(assetId),db,context.workspaceId))throw Object.assign(new Error(`Asset not found: ${assetId}`),{status:404});db.prepare("INSERT INTO captures(id,text,source,status,source_label,objects_json,created_at,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?,?,?)").run(id,text,source,"review",input.sourceLabel||"Typed capture","[]",time,time,context.workspaceId);attachAssets(id,input.assetIds,db,context.workspaceId);audit(db,"create","capture",id,text.slice(0,120),{op:"delete"},actor);const capture={id,text,source,status:"review",sourceLabel:input.sourceLabel||"Typed capture",objects:[],assets:assetsForCapture(id,db,context.workspaceId).map(asset=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size})),createdAt:time,version:1};runCaptureAutomations(capture,db,context.workspaceId);return capture;
}

export async function createFileCapture(file,db=getDatabase(),actor=null){
  const asset=await storeAsset({stream:file.stream,name:file.name,mime:file.type||"application/octet-stream"},loadConfig(),db,actorInfo(actor).workspaceId);
  return createCapture({text:file.name,source:"file",assetIds:[asset.id],sourceLabel:`${fileKind(file.type)} · ${formatSize(file.size)}`},db,actor);
}

export function updateCapture(id,status,version,db=getDatabase(),actor=null){
  if(!["processing","review","confirmed","failed","dismissed"].includes(status))throw new Error("Invalid capture status");const context=actorInfo(actor),before=findOwned(db,"captures",id,context.workspaceId);if(!before)throw Object.assign(new Error("Capture not found"),{status:404});requireVersion({version},before,{db,type:"capture",actor});db.prepare(`UPDATE captures SET status=?,updated_at=?,version=version+1 WHERE id=?${context.workspaceId?" AND workspace_id=?":""}`).run(status,stamp(),id,...(context.workspaceId?[context.workspaceId]:[]));audit(db,"status","capture",id,status,{op:"capture-status",status:before.status},actor);return {ok:true,version:before.version+1};
}

const cleanTaskArguments=args=>({title:required(args.title,"task title",500),dueAt:args.dueAt?absolute(args.dueAt,"dueAt").toISOString():null,project:args.project?required(args.project,"project",200):null,linkedActionId:args.linkedActionId?required(args.linkedActionId,"linked action id",100):null});
const cleanNoteArguments=args=>({title:required(args.title,"note title",500),content:String(args.content||"").slice(0,100000),tags:Array.isArray(args.tags)?args.tags.map(tag=>required(tag,"tag",100)).slice(0,20):[]});
function cleanEventArguments(args){const start=absolute(args.startAt,"startAt"),end=absolute(args.endAt,"endAt");if(end<=start){throw new Error("endAt must be after startAt")}eventPosition(start,required(args.timezone,"timezone",100));const reminders=(Array.isArray(args.reminders)?args.reminders:[]).map(item=>({offsetMinutes:Number(item.offsetMinutes)}));if(reminders.some(item=>!Number.isInteger(item.offsetMinutes)||item.offsetMinutes<0||item.offsetMinutes>525600)){throw new Error("Invalid reminder offset")}return {title:required(args.title,"event title",500),startAt:start.toISOString(),endAt:end.toISOString(),timezone:args.timezone,location:args.location?required(args.location,"location",500):null,reminders}}
const captureActionCleaners={"task.create":cleanTaskArguments,"event.create":cleanEventArguments,"note.create":cleanNoteArguments};
function cleanCaptureAction(action,ids){
  if(!action||ids.has(action.id)){throw new Error("Action ids must be unique")}const clean=captureActionCleaners[action.type];if(!clean){throw new Error(`Unsupported capture action: ${action.type}`)}ids.add(action.id);const confidence=Number(action.confidence);if(!Number.isFinite(confidence)||confidence<0||confidence>1){throw new Error("confidence must be between 0 and 1")}return {id:required(action.id,"action id",100),type:action.type,confidence,sourceReferences:Array.isArray(action.sourceReferences)?action.sourceReferences.map(value=>required(value,"source reference",500)).slice(0,20):[],arguments:clean(action.arguments||{})};
}

export function saveInterpretation(id,proposal,db=getDatabase()){
  if(proposal?.schemaVersion!==1||!Array.isArray(proposal.actions)||!Array.isArray(proposal.clarifications))throw new Error("Invalid capture proposal");
  const ids=new Set(),actions=proposal.actions.slice(0,20).map(action=>cleanCaptureAction(action,ids));
  for(const action of actions){if(action.type==="task.create"&&action.arguments.linkedActionId&&!ids.has(action.arguments.linkedActionId)){throw new Error("linkedActionId must reference another proposed action")}}
  const cleaned={schemaVersion:1,summary:required(proposal.summary,"proposal summary",1000),actions,clarifications:proposal.clarifications.map(value=>required(value,"clarification",1000)).slice(0,20)};const result=db.prepare("UPDATE captures SET status='review',objects_json=?,error=NULL,updated_at=?,version=version+1 WHERE id=?").run(JSON.stringify(cleaned),stamp(),id);if(!result.changes){throw new Error("Capture not found")}return cleaned;
}

function applyCaptureAction(action,captureId,db,actor){
  const id=randomUUID(),args=action.arguments||action,type=action.type.split(".")[0];let object;
  if(type==="task")object=saveTask({id,title:args.title,project:args.project||"Inbox",due:args.dueAt||"No date",reminderAt:args.dueAt,priority:"Medium"},db,actor);
  else if(type==="event"){const reminder=action.arguments?.reminders?.[0],reminderAt=reminder?new Date(new Date(args.startAt).getTime()-reminder.offsetMinutes*60000).toISOString():null;object=saveEvent(action.arguments?{id,title:args.title,startAt:args.startAt,endAt:args.endAt,timezone:args.timezone,location:args.location,reminderAt}:{id,title:args.title,day:new Date().getDay(),time:"09:00",top:0,height:58},db,actor)}
  else object=saveNote({id,title:args.title,content:args.content||args.detail||args.title,tags:args.tags||[],ai:true,source:`Capture ${captureId}`},db,actor);
  return {type,actionId:action.id,object};
}

export function applyCaptureInterpretation(id,db=getDatabase(),actor=null){
  const context=actorInfo(actor),capture=findOwned(db,"captures",id,context.workspaceId);if(!capture)throw Object.assign(new Error("Capture not found"),{status:404});
  if(capture.status==="confirmed")return {captureId:id,status:"confirmed",created:[]};if(capture.status!=="review")throw Object.assign(new Error(`Capture is ${capture.status}; only captures in review can be applied`),{status:409,code:"NOT_APPLICABLE"});
  const proposal=JSON.parse(capture.objects_json),actions=Array.isArray(proposal)?proposal:proposal.actions;if(!actions?.length)throw Object.assign(new Error("No interpreted actions to apply"),{status:409,code:"NOTHING_TO_APPLY"});
  const created=[];db.exec("BEGIN IMMEDIATE");
  try{
    for(const action of actions)created.push(applyCaptureAction(action,id,db,actor));
    db.prepare(`UPDATE captures SET status='confirmed',updated_at=?,version=version+1 WHERE id=?${context.workspaceId?" AND workspace_id=?":""}`).run(stamp(),id,...(context.workspaceId?[context.workspaceId]:[]));
    audit(db,"apply","capture",id,`Applied ${created.length} object(s) from capture`,{op:"delete-many",objects:created.map(({type,object})=>({type,id:object.id})),captureStatus:"review"},actor);
    db.exec("COMMIT");
  }catch(error){db.exec("ROLLBACK");throw error}
  return {captureId:id,status:"confirmed",created};
}

export function listAuditEvents(limit=100,db=getDatabase(),workspaceId=null){
  const bounded=Math.min(Math.max(Number(limit)||100,1),500);
  return db.prepare(`SELECT * FROM audit_events${workspaceId?" WHERE workspace_id=?":""} ORDER BY created_at DESC,rowid DESC LIMIT ?`).all(...(workspaceId?[workspaceId]:[]),bounded).map(row=>({id:row.id,actorId:row.actor_id,action:row.action,objectType:row.object_type,objectId:row.object_id,summary:row.summary,reversible:!!row.inverse_json,createdAt:row.created_at}));
}

function applyInverse(db,event,inverse){
  const table=objectTables[event.object_type];
  if(inverse.op==="delete"){if(!table)throw new Error("Unsupported object type");deleteObject(db,event.object_type,event.object_id);return}
  if(inverse.op==="restore"){const row=inverse.row;if(!table||!row)throw new Error("Unsupported restore inverse");db.prepare(`DELETE FROM ${table} WHERE id=?`).run(row.id);insertRow(db,table,row);if(event.object_type==="note"){reindexNote(db,row);reindexNoteLinks(row.id,row.content,db)}return}
  if(inverse.op==="capture-status"){db.prepare("UPDATE captures SET status=?,updated_at=?,version=version+1 WHERE id=?").run(inverse.status,stamp(),event.object_id);return}
  if(inverse.op==="delete-many"){for(const object of inverse.objects||[])if(objectTables[object.type]&&object.type!=="capture")deleteObject(db,object.type,object.id);if(inverse.captureStatus)db.prepare("UPDATE captures SET status=?,updated_at=?,version=version+1 WHERE id=?").run(inverse.captureStatus,stamp(),event.object_id);return}
  if(inverse.op==="delete-dependency"){db.prepare("DELETE FROM task_dependencies WHERE task_id=? AND depends_on_task_id=?").run(inverse.taskId,inverse.dependsOnTaskId);return}
  if(inverse.op==="create-dependency"){db.prepare("INSERT OR IGNORE INTO task_dependencies(task_id,depends_on_task_id,created_at) VALUES(?,?,?)").run(inverse.taskId,inverse.dependsOnTaskId,inverse.createdAt||stamp());return}
  throw new Error("Unsupported inverse operation");
}

export function undoAuditEvent(auditId,db=getDatabase(),actor=null){
  const context=actorInfo(actor),event=context.workspaceId?db.prepare("SELECT * FROM audit_events WHERE id=? AND workspace_id=?").get(auditId,context.workspaceId):db.prepare("SELECT * FROM audit_events WHERE id=?").get(auditId);if(!event)throw Object.assign(new Error("Audit event not found"),{status:404});
  const inverse=event.inverse_json?JSON.parse(event.inverse_json):null;if(!inverse)throw Object.assign(new Error("This action cannot be undone"),{status:409,code:"NOT_REVERSIBLE"});
  db.exec("BEGIN IMMEDIATE");
  try{applyInverse(db,event,inverse);audit(db,"undo",event.object_type,event.object_id,`Undo: ${event.summary}`,null,actor);db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}
  return {ok:true,undone:event.summary};
}

export function searchNotes(query,db=getDatabase(),workspaceId=null){
  const q=required(query,"query",500).replace(/["']/g," ");return db.prepare(`SELECT n.* FROM notes_fts f JOIN notes n ON n.id=f.id WHERE notes_fts MATCH ? AND n.trashed=0${workspaceId?" AND n.workspace_id=?":""} ORDER BY rank LIMIT 50`).all(q,...(workspaceId?[workspaceId]:[]));
}

export function noteVersions(noteId,db=getDatabase(),workspaceId=null){if(!findOwned(db,"notes",noteId,workspaceId))throw Object.assign(new Error("Note not found"),{status:404});return db.prepare("SELECT version,title,content,tags_json,created_at AS createdAt FROM note_versions WHERE note_id=? ORDER BY version DESC").all(noteId).map(row=>({...row,tags:parse(row.tags_json)}))}

export function restoreNoteVersion(noteId,version,db=getDatabase(),actor=null){const current=findOwned(db,"notes",noteId,actorInfo(actor).workspaceId);if(!current)throw Object.assign(new Error("Note not found"),{status:404});const snapshot=db.prepare("SELECT * FROM note_versions WHERE note_id=? AND version=?").get(noteId,Number(version));if(!snapshot)throw Object.assign(new Error("Note version not found"),{status:404});return saveNote({id:noteId,title:snapshot.title,content:snapshot.content,tags:parse(snapshot.tags_json),ai:!!current.ai,source:current.source,favorite:!!current.favorite,trashed:!!current.trashed,version:current.version},db,actor)}

export function importMarkdown(markdown,db=getDatabase(),actor=null){const content=required(markdown,"markdown",2_000_000),match=content.match(/^#\s+(.+)$/m),title=match?.[1].trim()||"Imported note";return saveNote({title,content,tags:[],source:"Markdown import"},db,actor)}

export function exportMarkdown(noteId,db=getDatabase(),workspaceId=null){const note=findOwned(db,"notes",noteId,workspaceId);if(!note)throw Object.assign(new Error("Note not found"),{status:404});return note.content.startsWith("# ")?note.content:`# ${note.title}\n\n${note.content}`}

export function requestNoteOptimization(noteId,mode="organize",db=getDatabase(),workspaceId=null){const note=findOwned(db,"notes",noteId,workspaceId,"AND trashed=0");if(!note)throw Object.assign(new Error("Note not found"),{status:404});if(!note.draft)throw new Error("Only Draft notes can be optimized");if(!["light","organize","study","technical","voice"].includes(mode))throw new Error("Unknown optimization mode");const id=randomUUID(),jobId=enqueueJob("note-optimize",{optimizationId:id,noteId,mode},db,workspaceId),time=stamp();db.prepare("INSERT INTO note_optimizations(id,note_id,job_id,mode,state,before_content,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,noteId,jobId,mode,"queued",note.content,time,time);return {id,jobId,state:"queued"}}
export const noteOptimizations=(noteId,db=getDatabase(),workspaceId=null)=>{if(!findOwned(db,"notes",noteId,workspaceId))throw Object.assign(new Error("Note not found"),{status:404});return db.prepare("SELECT * FROM note_optimizations WHERE note_id=? ORDER BY created_at DESC LIMIT 20").all(noteId)};
export function finishNoteOptimization(id,result,provider,db=getDatabase()){const changed=db.prepare("UPDATE note_optimizations SET state='ready',after_content=?,summary=?,provider=?,updated_at=? WHERE id=? AND state='queued'").run(String(result.content||""),String(result.summary||""),provider,stamp(),id);if(!changed.changes)throw new Error("Optimization proposal is not queued")}
export function failNoteOptimization(id,error,db=getDatabase()){db.prepare("UPDATE note_optimizations SET state='failed',error=?,updated_at=? WHERE id=? AND state='queued'").run(String(error).slice(0,2000),stamp(),id)}
export function applyNoteOptimization(id,db=getDatabase(),actor=null){const workspaceId=actorInfo(actor).workspaceId,proposal=db.prepare(`SELECT o.* FROM note_optimizations o JOIN notes n ON n.id=o.note_id WHERE o.id=? AND o.state='ready'${workspaceId?" AND n.workspace_id=?":""}`).get(id,...(workspaceId?[workspaceId]:[]));if(!proposal)throw Object.assign(new Error("Ready optimization not found"),{status:404});const note=findOwned(db,"notes",proposal.note_id,workspaceId);db.exec("BEGIN IMMEDIATE");try{const saved=saveNote({id:note.id,title:note.title,content:proposal.after_content,tags:parse(note.tags_json),ai:true,draft:false,source:note.source,favorite:!!note.favorite,trashed:!!note.trashed,version:note.version},db,actor);db.prepare("UPDATE note_optimizations SET state='applied',applied_at=?,updated_at=? WHERE id=?").run(stamp(),stamp(),id);db.exec("COMMIT");return saved}catch(error){db.exec("ROLLBACK");throw error}}
export function rejectNoteOptimization(id,db=getDatabase(),workspaceId=null){const changed=db.prepare(`UPDATE note_optimizations SET state='rejected',updated_at=? WHERE id=? AND state='ready'${workspaceId?" AND note_id IN (SELECT id FROM notes WHERE workspace_id=?)":""}`).run(stamp(),id,...(workspaceId?[workspaceId]:[]));if(!changed.changes)throw Object.assign(new Error("Ready optimization not found"),{status:404});return {ok:true}}

export function searchAll(query,db=getDatabase(),workspaceId=null){const q=required(query,"query",500),like=`%${q.replace(/[\\%_]/g,"\\$&")}%`,limit=20,scope=workspaceId?[workspaceId]:[];return {notes:searchNotes(q,db,workspaceId),tasks:db.prepare(`SELECT id,title,project,due,updated_at AS updatedAt FROM tasks WHERE archived=0 AND (title LIKE ? ESCAPE '\\' OR project LIKE ? ESCAPE '\\')${workspaceId?" AND workspace_id=?":""} ORDER BY updated_at DESC LIMIT ?`).all(like,like,...scope,limit),events:db.prepare(`SELECT id,title,day,time,location,start_at AS startAt,end_at AS endAt,timezone,updated_at AS updatedAt FROM events WHERE deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\')${workspaceId?" AND workspace_id=?":""} ORDER BY updated_at DESC LIMIT ?`).all(like,like,...scope,limit),projects:db.prepare(`SELECT id,name,status,summary,updated_at AS updatedAt FROM projects WHERE (name LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\')${workspaceId?" AND workspace_id=?":""} ORDER BY updated_at DESC LIMIT ?`).all(like,like,...scope,limit),captures:db.prepare(`SELECT id,text,source,status,updated_at AS updatedAt FROM captures WHERE text LIKE ? ESCAPE '\\'${workspaceId?" AND workspace_id=?":""} ORDER BY updated_at DESC LIMIT ?`).all(like,...scope,limit)}}

export function saveProject(input,db=getDatabase(),actor=null){
  const context=actorInfo(actor),id=input.id||randomUUID(),name=required(input.name,"name",200),time=stamp(),before=findOwned(db,"projects",id,context.workspaceId);
  requireVersion(input,before,{db,type:"project",actor});
  const status=["Active","Planned","Archived"].includes(input.status)?input.status:"Active";
  const summary=String(input.summary||"").slice(0,1000);
  db.prepare(`INSERT INTO projects(id,name,status,summary,created_at,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,summary=excluded.summary,updated_at=excluded.updated_at,version=projects.version+1`).run(id,name,status,summary,before?.created_at||time,time,context.workspaceId);
  audit(db,before?"update":"create","project",id,name,before?{op:"restore",row:before}:{op:"delete"},actor);
  return findOwned(db,"projects",id,context.workspaceId);
}

export function deleteProject(id,db=getDatabase(),actor=null){
  const context=actorInfo(actor),before=findOwned(db,"projects",id,context.workspaceId);if(!before)throw Object.assign(new Error("Project not found"),{status:404});
  db.prepare(`DELETE FROM projects WHERE id=?${context.workspaceId?" AND workspace_id=?":""}`).run(id,...(context.workspaceId?[context.workspaceId]:[]));
  audit(db,"delete","project",id,before.name,{op:"restore",row:before},actor);return {ok:true};
}

export function saveTaskDependency(taskId,dependsOnTaskId,db=getDatabase(),actor=null){
  if(taskId===dependsOnTaskId)throw Object.assign(new Error("A task cannot depend on itself"),{status:409});
  const workspaceId=actorInfo(actor).workspaceId,task=findOwned(db,"tasks",taskId,workspaceId);if(!task)throw Object.assign(new Error("Task not found"),{status:404});
  const dep=findOwned(db,"tasks",dependsOnTaskId,workspaceId);if(!dep)throw Object.assign(new Error("Dependency task not found"),{status:404});
  const existing=db.prepare("SELECT 1 FROM task_dependencies WHERE task_id=? AND depends_on_task_id=?").get(taskId,dependsOnTaskId);
  if(existing)return {taskId,dependsOnTaskId,createdAt:null};
  const reciprocal=db.prepare("SELECT 1 FROM task_dependencies WHERE task_id=? AND depends_on_task_id=?").get(dependsOnTaskId,taskId);
  if(reciprocal)throw Object.assign(new Error("Circular dependency detected"),{status:409});
  const time=stamp();
  db.prepare("INSERT OR IGNORE INTO task_dependencies(task_id,depends_on_task_id,created_at) VALUES(?,?,?)").run(taskId,dependsOnTaskId,time);
  audit(db,"create","task_dependency",`${taskId}->${dependsOnTaskId}`,"",{op:"delete-dependency",taskId,dependsOnTaskId},actor);
  return {taskId,dependsOnTaskId,createdAt:time};
}

export function removeTaskDependency(taskId,dependsOnTaskId,db=getDatabase(),actor=null){
  const before=db.prepare("SELECT * FROM task_dependencies WHERE task_id=? AND depends_on_task_id=?").get(taskId,dependsOnTaskId);
  if(!before)throw Object.assign(new Error("Dependency not found"),{status:404});
  db.prepare("DELETE FROM task_dependencies WHERE task_id=? AND depends_on_task_id=?").run(taskId,dependsOnTaskId);
  audit(db,"delete","task_dependency",`${taskId}->${dependsOnTaskId}`,"",{op:"create-dependency",taskId,dependsOnTaskId,createdAt:before.created_at},actor);
  return {ok:true};
}

export function dependenciesForTask(taskId,db=getDatabase(),workspaceId=null){if(!findOwned(db,"tasks",taskId,workspaceId))throw Object.assign(new Error("Task not found"),{status:404});return db.prepare("SELECT depends_on_task_id AS dependsOnTaskId,created_at AS createdAt FROM task_dependencies WHERE task_id=?").all(taskId)}
export function dependentsForTask(taskId,db=getDatabase(),workspaceId=null){if(!findOwned(db,"tasks",taskId,workspaceId))throw Object.assign(new Error("Task not found"),{status:404});return db.prepare("SELECT task_id AS taskId,created_at AS createdAt FROM task_dependencies WHERE depends_on_task_id=?").all(taskId)}

const linkPattern=/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g;
export function noteLinks(content){const links=new Map();for(const match of String(content).matchAll(linkPattern)){const text=match[1].trim();if(text)links.set(text.toLowerCase(),text)}return [...links.values()]}

export function reindexNoteLinks(noteId,content,db=getDatabase(),workspaceId=null){
  db.prepare("DELETE FROM note_links WHERE source_note_id=?").run(noteId);
  const links=noteLinks(content),time=stamp();
  for(const text of links){
    const target=db.prepare(`SELECT id FROM notes WHERE LOWER(title)=LOWER(?) AND trashed=0${workspaceId?" AND workspace_id=?":""}`).get(text,...(workspaceId?[workspaceId]:[]));
    if(target)db.prepare("INSERT OR IGNORE INTO note_links(source_note_id,target_note_id,link_text,created_at) VALUES(?,?,?,?)").run(noteId,target.id,text,time);
  }
}

export function linksForNote(noteId,db=getDatabase(),workspaceId=null){if(!findOwned(db,"notes",noteId,workspaceId))throw Object.assign(new Error("Note not found"),{status:404});return db.prepare("SELECT target_note_id AS targetNoteId,link_text AS linkText,created_at AS createdAt FROM note_links WHERE source_note_id=?").all(noteId)}
export function backlinksForNote(noteId,db=getDatabase(),workspaceId=null){if(!findOwned(db,"notes",noteId,workspaceId))throw Object.assign(new Error("Note not found"),{status:404});return db.prepare("SELECT source_note_id AS sourceNoteId,link_text AS linkText,created_at AS createdAt FROM note_links WHERE target_note_id=?").all(noteId)}
