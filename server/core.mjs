import {createHash,randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {runCaptureAutomations} from "./modules.mjs";
import {assetPath,assetsForCapture,attachAssets,getAsset,storeAsset} from "./objects.mjs";
import {loadConfig} from "./config.mjs";
import {enqueueJob} from "./jobs.mjs";
import {recordConflict} from "./collaboration.mjs";
import {prepareVaultTaskWriteback} from "./vault-task-writeback.mjs";
import {createVaultNote,sourceRoot,trashVaultEntry} from "./vault.mjs";
import {copyFileSync,mkdirSync} from "node:fs";
import {dirname,extname,join} from "node:path";
import {occurrences,untilRule} from "./recurrence.mjs";

const stamp=()=>new Date().toISOString();
const formatSize=bytes=>bytes>1024*1024?`${(bytes/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
const fileKind=type=>type?.startsWith("image/")?"Image":type?.startsWith("audio/")?"Audio":type?.startsWith("text/")?"Text":type==="application/pdf"?"Document":type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"?"Document":"File";
const parse=value=>{try{return JSON.parse(value)}catch{return []}};
const captureActionDetail=(type,args)=>{if(type==="event")return `${args.startAt} · ${args.timezone}`;if(type==="task")return args.dueAt||args.project||"No due date";return (args.content||"").slice(0,140)};
const captureObjects=value=>{const parsed=parse(value),actions=Array.isArray(parsed)?parsed:parsed.actions||[];return actions.map(action=>{if(!action.type.includes(".")){return action}const type=action.type.split(".")[0],args=action.arguments;return {...action,type,title:args.title,detail:captureActionDetail(type,args)}})};
const required=(value,name,max=10000)=>{if(typeof value!=="string"||!value.trim())throw new Error(`${name} is required`);if(value.length>max)throw new Error(`${name} is too long`);return value.trim()};
const timestamp=value=>{if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new Error("reminderAt must be a valid date");return date.toISOString()};
const dueLabel=value=>value?new Intl.DateTimeFormat("en",{dateStyle:"medium"}).format(new Date(value)):"No date";
const absolute=(value,name)=>{const date=new Date(value);if(Number.isNaN(date.getTime()))throw new Error(`${name} must be a valid date`);return date};
const eventPosition=(date,timezone)=>{let parts;try{parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:timezone,weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date).map(part=>[part.type,part.value]))}catch{throw new Error("timezone must be a valid IANA time zone")}return {day:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(parts.weekday),time:`${parts.hour}:${parts.minute}`}};
const eventRow=(row,db)=>({...row,active:!!row.active,allDay:!!row.all_day,taskId:row.task_id||null,reminderAt:row.reminder_at,startAt:row.start_at,endAt:row.end_at,reminders:db?db.prepare("SELECT offset_minutes AS offsetMinutes,reminder_at AS reminderAt FROM event_reminders WHERE event_id=? ORDER BY offset_minutes DESC").all(row.id):[],recurrence:row.recurrence_json?parse(row.recurrence_json):null,deletedAt:row.deleted_at});
const queueCalendarWrite=(db,row,operation,actor,calendarId)=>{if(!actor)return;let mapping=db.prepare("SELECT * FROM calendar_event_mappings WHERE local_event_id=?").get(row.id);if(!mapping&&calendarId){const calendar=db.prepare("SELECT c.account_id FROM google_calendars c JOIN google_accounts a ON a.id=c.account_id WHERE a.user_id=? AND c.calendar_id=? AND c.selected=1").get(actor,calendarId);if(!calendar)throw new Error("Select a valid Google calendar");const id=randomUUID(),googleId=createHash("sha256").update(row.id).digest("hex").slice(0,32);db.prepare("INSERT INTO calendar_event_mappings(id,account_id,calendar_id,local_event_id,google_event_id,last_local_version,google_snapshot_json,last_synced_at) VALUES(?,?,?,?,?,?,?,?)").run(id,calendar.account_id,calendarId,row.id,googleId,0,"{}",stamp());mapping={id}}if(mapping){const time=stamp();db.prepare("INSERT OR IGNORE INTO calendar_sync_writes(id,mapping_id,operation,payload_json,local_version,next_attempt_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(randomUUID(),mapping.id,operation,JSON.stringify(row),row.version,time,time,time)}};
const actorInfo=actor=>typeof actor==="object"&&actor?{id:actor.id||null,workspaceId:actor.workspaceId||actor.workspace?.id||null}:{id:actor||null,workspaceId:null};
const findOwned=(db,table,id,workspaceId,extra="")=>{const row=workspaceId?db.prepare(`SELECT * FROM ${table} WHERE id=? AND workspace_id=? ${extra}`).get(id,workspaceId):db.prepare(`SELECT * FROM ${table} WHERE id=? ${extra}`).get(id);if(!row&&workspaceId&&db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id))throw Object.assign(new Error(`${table.slice(0,-1)} not found`),{status:404});return row};
const requireVersion=(input,before,{db,type,actor}={})=>{if(before&&input.version!==before.version){const context=actorInfo(actor),conflict=context.workspaceId&&context.id?recordConflict(context.workspaceId,context.id,type,before.id,Number(input.version)||0,before,input,db):null;throw Object.assign(new Error(`Expected version ${before.version}`),{status:409,code:"VERSION_CONFLICT",conflictId:conflict?.id})}};
const audit=(db,action,type,id,summary,inverse=null,actor=null)=>{const context=actorInfo(actor);db.prepare("INSERT INTO audit_events(id,actor_id,action,object_type,object_id,summary,inverse_json,workspace_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)").run(randomUUID(),context.id,action,type,id,summary,inverse?JSON.stringify(inverse):null,context.workspaceId,stamp())};
const objectTables={task:"tasks",event:"events",note:"notes",capture:"captures",project:"projects"};
const insertRow=(db,table,row)=>{const columns=Object.keys(row);db.prepare(`INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(()=>"?").join(",")})`).run(...columns.map(column=>row[column]))};
const deleteObject=(db,type,id)=>{db.prepare(`DELETE FROM ${objectTables[type]} WHERE id=?`).run(id);if(type==="note")db.prepare("DELETE FROM notes_fts WHERE id=?").run(id)};
const reindexNote=(db,row)=>{db.prepare("DELETE FROM notes_fts WHERE id=?").run(row.id);db.prepare("INSERT INTO notes_fts(id,title,content,tags) VALUES(?,?,?,?)").run(row.id,row.title,row.content,parse(row.tags_json).join(" "))};
const noteProjection=(row,db)=>{const source=db.prepare("SELECT e.source_id,e.relative_path,e.sync_state FROM vault_entries e WHERE e.note_id=? AND e.deleted_at IS NULL LIMIT 1").get(row.id),blocks=db.prepare("SELECT b.id,b.position,b.kind,b.version,i.width,i.height,i.transcript,i.ocr_status AS ocrStatus FROM note_blocks b LEFT JOIN note_ink_blocks i ON i.block_id=b.id WHERE b.note_id=? ORDER BY b.position").all(row.id);return {...row,sourceId:source?.source_id||null,relativePath:source?.relative_path||null,syncState:source?.sync_state||(row.source?.startsWith("Obsidian · ")?"unmapped":"local"),blocks}};
const taskProjection=(row,db)=>{const source=db.prepare("SELECT l.source_id,l.relative_path,l.block_id,l.line_number,s.name AS source_name,e.note_id FROM vault_task_links l JOIN vault_sources s ON s.id=l.source_id JOIN vault_entries e ON e.source_id=l.source_id AND e.relative_path=l.relative_path WHERE l.task_id=?").get(row.id);return {...row,completed:!!row.completed,archived:!!row.archived,eventId:row.event_id||null,reminderAt:row.reminder_at,dueAt:row.due_at,scheduledStartAt:row.scheduled_start_at,scheduledEndAt:row.scheduled_end_at,estimatedMinutes:row.estimated_minutes,projectId:row.project_id,courseId:row.course_id,parentTaskId:row.parent_task_id,completedAt:row.completed_at,subtasks:parse(row.subtasks_json),vaultSource:source?{sourceId:source.source_id,sourceName:source.source_name,relativePath:source.relative_path,blockId:source.block_id,lineNumber:source.line_number,noteId:source.note_id}:null}};

function placeholders(ids){return ids.length?ids.map(()=>"?").join(","):"'none'"}
function taskProjectionFromMap(row,vaultTaskLinkMap){const source=vaultTaskLinkMap.get(row.id);return {...row,completed:!!row.completed,archived:!!row.archived,eventId:row.event_id||null,reminderAt:row.reminder_at,dueAt:row.due_at,scheduledStartAt:row.scheduled_start_at,scheduledEndAt:row.scheduled_end_at,estimatedMinutes:row.estimated_minutes,projectId:row.project_id,courseId:row.course_id,parentTaskId:row.parent_task_id,completedAt:row.completed_at,subtasks:parse(row.subtasks_json),vaultSource:source?{sourceId:source.sourceId,sourceName:source.sourceName,relativePath:source.relativePath,blockId:source.blockId,lineNumber:source.lineNumber,noteId:source.noteId}:null}}
function noteProjectionFromMap(row,vaultSourceMap,noteBlocksMap){const source=vaultSourceMap.get(row.id),blocks=noteBlocksMap.get(row.id)||[];const {content,...rest}=row;return {...rest,ai:!!row.ai,draft:!!row.draft,favorite:!!row.favorite,trashed:!!row.trashed,tags:parse(row.tags_json),time:row.updated_at,sourceId:source?.sourceId||null,relativePath:source?.relativePath||null,syncState:source?.syncState||(row.source?.startsWith("Obsidian · ")?"unmapped":"local"),blocks:blocks.map(block=>({id:block.id,position:block.position,kind:block.kind,version:block.version,width:block.width,height:block.height,transcript:block.transcript,ocrStatus:block.ocrStatus}))}}

export function listState(db=getDatabase(),workspaceId=null){const filter=workspaceId?" WHERE workspace_id=?":"",args=workspaceId?[workspaceId]:[];
  const taskRows=db.prepare(`SELECT * FROM tasks${filter} ORDER BY created_at DESC`).all(...args),noteRows=db.prepare(`SELECT * FROM notes${filter} ORDER BY updated_at DESC`).all(...args),captureRows=db.prepare(`SELECT * FROM captures${filter} ORDER BY created_at DESC`).all(...args);
  const taskIds=taskRows.map(row=>row.id),noteIds=noteRows.map(row=>row.id),captureIds=captureRows.map(row=>row.id);
  const vaultTaskLinkMap=new Map;
  if(taskIds.length)for(const link of db.prepare(`SELECT l.task_id AS taskId,l.source_id AS sourceId,l.relative_path AS relativePath,l.block_id AS blockId,l.line_number AS lineNumber,s.name AS sourceName,e.note_id AS noteId FROM vault_task_links l JOIN vault_sources s ON s.id=l.source_id JOIN vault_entries e ON e.source_id=l.source_id AND e.relative_path=l.relative_path WHERE l.task_id IN (${placeholders(taskIds)})`).all(...taskIds))vaultTaskLinkMap.set(link.taskId,link);
  const vaultSourceMap=new Map;
  if(noteIds.length)for(const entry of db.prepare(`SELECT e.source_id AS sourceId,e.relative_path AS relativePath,e.sync_state AS syncState,e.note_id AS noteId FROM vault_entries e WHERE e.note_id IN (${placeholders(noteIds)}) AND e.deleted_at IS NULL`).all(...noteIds))vaultSourceMap.set(entry.noteId,entry);
  const noteBlocksMap=new Map;
  if(noteIds.length)for(const block of db.prepare(`SELECT b.id,b.position,b.kind,b.version,i.width,i.height,i.transcript,i.ocr_status AS ocrStatus,b.note_id AS noteId FROM note_blocks b LEFT JOIN note_ink_blocks i ON i.block_id=b.id WHERE b.note_id IN (${placeholders(noteIds)}) ORDER BY b.position`).all(...noteIds)){const arr=noteBlocksMap.get(block.noteId)||[];arr.push(block);noteBlocksMap.set(block.noteId,arr)}
  const noteAssetsMap=new Map;
  if(noteIds.length)for(const asset of db.prepare(`SELECT na.note_id AS noteId,a.id,a.name,a.mime,a.size,na.relative_path AS relativePath FROM note_assets na JOIN assets a ON a.id=na.asset_id WHERE na.note_id IN (${placeholders(noteIds)})`).all(...noteIds)){const arr=noteAssetsMap.get(asset.noteId)||[];arr.push(asset);noteAssetsMap.set(asset.noteId,arr)}
  const captureAssetsMap=new Map;
  if(captureIds.length)for(const asset of db.prepare(`SELECT a.id,a.name,a.mime,a.size,ca.capture_id AS captureId FROM capture_assets ca JOIN assets a ON a.id=ca.asset_id WHERE ca.capture_id IN (${placeholders(captureIds)})`).all(...captureIds)){const arr=captureAssetsMap.get(asset.captureId)||[];arr.push(asset);captureAssetsMap.set(asset.captureId,arr)}
  const handwritingCaptureMap=new Map;
  if(captureIds.length)for(const item of db.prepare(`SELECT h.capture_id AS captureId,h.note_id AS noteId,h.ink_block_id AS inkBlockId,h.state,h.original_path AS originalPath,h.result_json AS resultJson,n.title,e.relative_path AS currentPath FROM handwriting_intakes h JOIN notes n ON n.id=h.note_id LEFT JOIN vault_entries e ON e.note_id=h.note_id AND e.deleted_at IS NULL WHERE h.capture_id IN (${placeholders(captureIds)})`).all(...captureIds)){const result=item.resultJson?parse(item.resultJson):{},path=item.currentPath||item.originalPath;handwritingCaptureMap.set(item.captureId,{noteId:item.noteId,inkBlockId:item.inkBlockId,state:item.state,title:result.title||item.title,path,folder:path.split("/").slice(0,-1).join("/"),action:result.action||null,confidence:Number.isFinite(result.confidence)?result.confidence:null,provider:result.provider||null})}
  const tasks=taskRows.map(row=>taskProjectionFromMap(row,vaultTaskLinkMap)),notes=noteRows.map(row=>({...noteProjectionFromMap(row,vaultSourceMap,noteBlocksMap),assets:noteAssetsMap.get(row.id)||[]})),events=db.prepare(`SELECT * FROM events WHERE deleted_at IS NULL${workspaceId?" AND workspace_id=?":""} ORDER BY start_at`).all(...args).map(row=>eventRow(row,db));
  return {
    tasks,
    events,
    notes,
    captures:captureRows.map(row=>({id:row.id,text:row.text,source:row.source,status:row.status,sourceLabel:row.source_label,objects:captureObjects(row.objects_json),error:row.error,assets:(captureAssetsMap.get(row.id)||[]).map(asset=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size})),handwriting:handwritingCaptureMap.get(row.id)||null,createdAt:row.created_at,version:row.version})),
    projects:db.prepare(`SELECT * FROM projects${filter} ORDER BY name`).all(...args),
    taskDependencies:db.prepare(`SELECT d.task_id AS taskId,d.depends_on_task_id AS dependsOnTaskId,d.created_at AS createdAt FROM task_dependencies d JOIN tasks t ON t.id=d.task_id${workspaceId?" WHERE t.workspace_id=?":""}`).all(...args),
    noteLinks:db.prepare(`SELECT l.source_note_id AS sourceNoteId,l.target_note_id AS targetNoteId,l.link_text AS linkText,l.created_at AS createdAt FROM note_links l JOIN notes n ON n.id=l.source_note_id${workspaceId?" WHERE n.workspace_id=?":""}`).all(...args),
    calendarItems:[...events.map(event=>({kind:"event",event})),...db.prepare(`SELECT * FROM tasks WHERE archived=0 AND (due_at IS NOT NULL OR scheduled_start_at IS NOT NULL)${workspaceId?" AND workspace_id=?":""} ORDER BY COALESCE(scheduled_start_at,due_at)`).all(...args).map(row=>({kind:"task",task:taskProjectionFromMap(row,vaultTaskLinkMap)}))],
  };
}

function computeAutoReminder(input, before) {
  if (input.reminderAt !== undefined) return timestamp(input.reminderAt);
  const targetIso = input.scheduledStartAt || input.dueAt || before?.scheduled_start_at || before?.due_at;
  if (!targetIso) return null;
  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) return null;
  const nowMs = Date.now();
  const intervals = [60, 30, 5, 0];
  for (const minutes of intervals) {
    const reminderMs = targetMs - minutes * 60000;
    if (reminderMs >= nowMs - 60000) {
      return new Date(reminderMs).toISOString();
    }
  }
  return null;
}

export function saveTask(input,db=getDatabase(),actor=null){
  const context=actorInfo(actor),id=input.id||randomUUID(),title=required(input.title,"title",500),priority=["High","Medium","Low"].includes(input.priority)?input.priority:"Medium",time=stamp(),before=findOwned(db,"tasks",id,context.workspaceId);
  requireVersion(input,before,{db,type:"task",actor});
  const writeBack=before&&!actor?.skipVaultWriteback?prepareVaultTaskWriteback(id,input,db):null;
  const reminderAt=computeAutoReminder(input,before),dueAt=timestamp(input.dueAt),scheduledStart=timestamp(input.scheduledStartAt),scheduledEnd=timestamp(input.scheduledEndAt),completed=input.status==="completed"||!!input.completed,status=input.status||(completed?"completed":"open"),completedAt=completed?(timestamp(input.completedAt)||before?.completed_at||time):null,estimate=input.estimatedMinutes==null?null:Number(input.estimatedMinutes);
  if(!["open","in_progress","blocked","completed","cancelled"].includes(status))throw new Error("Unknown task status");
  if(scheduledStart&&scheduledEnd&&scheduledEnd<=scheduledStart)throw new Error("scheduledEndAt must follow scheduledStartAt");
  if(estimate!=null&&(!Number.isInteger(estimate)||estimate<1||estimate>10080))throw new Error("estimatedMinutes must be an integer between 1 and 10080");
  for(const [field,table,value] of [["projectId","projects",input.projectId],["courseId","courses",input.courseId],["parentTaskId","tasks",input.parentTaskId]])if(value&&!findOwned(db,table,value,context.workspaceId))throw new Error(`${field} does not reference an accessible object`);
  const project=input.projectId?findOwned(db,"projects",input.projectId,context.workspaceId).name:required(input.project||before?.project||"Inbox","project",200),due=input.due||(dueAt?dueLabel(dueAt):before?.due||"No date");
  db.prepare(`INSERT INTO tasks(id,title,project,due,priority,completed,recurrence,subtasks_json,archived,reminder_at,created_at,updated_at,workspace_id,project_id,course_id,status,due_at,scheduled_start_at,scheduled_end_at,estimated_minutes,parent_task_id,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,project=excluded.project,due=excluded.due,priority=excluded.priority,completed=excluded.completed,recurrence=excluded.recurrence,subtasks_json=excluded.subtasks_json,archived=excluded.archived,reminder_sent_at=CASE WHEN tasks.reminder_at IS excluded.reminder_at THEN tasks.reminder_sent_at ELSE NULL END,reminder_at=excluded.reminder_at,updated_at=excluded.updated_at,project_id=excluded.project_id,course_id=excluded.course_id,status=excluded.status,due_at=excluded.due_at,scheduled_start_at=excluded.scheduled_start_at,scheduled_end_at=excluded.scheduled_end_at,estimated_minutes=excluded.estimated_minutes,parent_task_id=excluded.parent_task_id,completed_at=excluded.completed_at,version=tasks.version+1`).run(id,title,project,due,priority,completed?1:0,input.recurrence||null,JSON.stringify(input.subtasks||[]),input.archived?1:0,reminderAt,before?.created_at||time,time,context.workspaceId,input.projectId||null,input.courseId||null,status,dueAt,scheduledStart,scheduledEnd,estimate,input.parentTaskId||null,completedAt);
  audit(db,before?"update":"create","task",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);writeBack?.();return findOwned(db,"tasks",id,context.workspaceId);
}

export function saveEvent(input,db=getDatabase(),actor=null,options={}){
  const context=actorInfo(actor),id=input.id||randomUUID(),title=required(input.title,"title",500),now=stamp(),before=findOwned(db,"events",id,context.workspaceId),timezone=required(input.timezone||before?.timezone||"UTC","timezone",100),legacyDay=Number(input.day),legacyTime=String(input.time||"09:00");
  if(input.googleCalendarId&&context.id&&!db.prepare("SELECT 1 FROM google_calendars c JOIN google_accounts a ON a.id=c.account_id WHERE a.user_id=? AND c.calendar_id=? AND c.selected=1").get(context.id,input.googleCalendarId))throw new Error("Select a valid Google calendar");
  requireVersion(input,before,{db,type:"event",actor});
  let start;if(input.startAt)start=absolute(input.startAt,"startAt");else{if(!Number.isInteger(legacyDay)||legacyDay<0||legacyDay>6||!/^\d{2}:\d{2}$/.test(legacyTime))throw new Error("A valid startAt or legacy day/time is required");const date=new Date(),monday=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-((date.getUTCDay()+6)%7))),[hour,minute]=legacyTime.split(":").map(Number);start=new Date(monday);start.setUTCDate(start.getUTCDate()+legacyDay);start.setUTCHours(hour,minute,0,0)}
  const end=input.endAt?absolute(input.endAt,"endAt"):new Date(start.getTime()+3600000);if(end<=start)throw new Error("endAt must be after startAt");
  const {day,time:timeValue}=eventPosition(start,timezone),height=Math.max(15,(end-start)/60000)*0.85,recurrence=input.recurrence==null?null:JSON.stringify(input.recurrence),reminderAt=timestamp(input.reminderAt);
  db.prepare(`INSERT INTO events(id,title,day,time,top,height,location,active,reminder_at,start_at,end_at,timezone,all_day,recurrence_json,deleted_at,created_at,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,day=excluded.day,time=excluded.time,top=excluded.top,height=excluded.height,location=excluded.location,active=excluded.active,reminder_sent_at=CASE WHEN events.reminder_at IS excluded.reminder_at THEN events.reminder_sent_at ELSE NULL END,reminder_at=excluded.reminder_at,start_at=excluded.start_at,end_at=excluded.end_at,timezone=excluded.timezone,all_day=excluded.all_day,recurrence_json=excluded.recurrence_json,deleted_at=NULL,updated_at=excluded.updated_at,version=events.version+1`).run(id,title,day,timeValue,Number(input.top)||0,height,input.location||null,input.active?1:0,reminderAt,start.toISOString(),end.toISOString(),timezone,input.allDay?1:0,recurrence,null,before?.created_at||now,now,context.workspaceId);
  const reminders=input.allDay?[]:[...new Set((input.reminders||[]).map(item=>Number(item.offsetMinutes)).filter(value=>Number.isInteger(value)&&value>=0&&value<=525600))];
  db.prepare("DELETE FROM event_reminders WHERE event_id=?").run(id);for(const offset of reminders)db.prepare("INSERT INTO event_reminders(event_id,offset_minutes,reminder_at) VALUES(?,?,?)").run(id,offset,new Date(start.getTime()-offset*60000).toISOString());
  const saved=eventRow(findOwned(db,"events",id,context.workspaceId),db);audit(db,before?"update":"create","event",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);if(!options.skipCalendarSync)queueCalendarWrite(db,saved,before?"update":"create",context.id,input.googleCalendarId);return saved;
}

export function deleteEvent(id,version,db=getDatabase(),actor=null,options={}){const context=actorInfo(actor),before=findOwned(db,"events",id,context.workspaceId,"AND deleted_at IS NULL");if(!before)throw Object.assign(new Error("Event not found"),{status:404});requireVersion({version},before,{db,type:"event",actor});const time=stamp();db.prepare(`UPDATE events SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?${context.workspaceId?" AND workspace_id=?":""}`).run(time,time,id,...(context.workspaceId?[context.workspaceId]:[]));const row=findOwned(db,"events",id,context.workspaceId);audit(db,"delete","event",id,before.title,{op:"restore",row:before},actor);if(!options.skipCalendarSync)queueCalendarWrite(db,row,"delete",context.id);return {ok:true,deletedAt:time,version:before.version+1}}

export function eventOccurrences(id,rangeStart,rangeEnd,db=getDatabase(),actor=null){const context=actorInfo(actor),event=eventRow(findOwned(db,"events",id,context.workspaceId,"AND deleted_at IS NULL"),db);if(!event)throw Object.assign(new Error("Event not found"),{status:404});const overrides=db.prepare("SELECT original_start_at AS originalStartAt,start_at AS startAt,end_at AS endAt,all_day AS allDay,cancelled FROM event_occurrences WHERE event_id=?").all(id).map(row=>({...row,allDay:row.allDay==null?undefined:!!row.allDay,cancelled:!!row.cancelled}));return occurrences(event,rangeStart,rangeEnd,overrides)}

export function mutateEventOccurrence(id,originalStartAt,input,db=getDatabase(),actor=null){const context=actorInfo(actor),event=eventRow(findOwned(db,"events",id,context.workspaceId,"AND deleted_at IS NULL"),db);if(!event)throw Object.assign(new Error("Event not found"),{status:404});requireVersion(input,event,{db,type:"event",actor});const original=absolute(originalStartAt,"originalStartAt").toISOString(),start=absolute(input.startAt,"startAt"),end=absolute(input.endAt,"endAt");if(end<=start)throw new Error("endAt must be after startAt");const scope=input.scope;if(!["this","following","all"].includes(scope))throw new Error("Invalid occurrence scope");
  if(scope==="all")return saveEvent({...event,startAt:start.toISOString(),endAt:end.toISOString(),allDay:!!input.allDay,version:event.version},db,actor);
  if(scope==="this"){const time=stamp();db.prepare("INSERT INTO event_occurrences(event_id,original_start_at,start_at,end_at,all_day,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(event_id,original_start_at) DO UPDATE SET start_at=excluded.start_at,end_at=excluded.end_at,all_day=excluded.all_day,cancelled=0,updated_at=excluded.updated_at").run(id,original,start.toISOString(),end.toISOString(),input.allDay?1:0,time,time);audit(db,"occurrence-update","event",id,event.title,null,actor);return {event,scope,originalStartAt:original,startAt:start.toISOString(),endAt:end.toISOString(),allDay:!!input.allDay}}
  const successor=saveEvent({...event,id:randomUUID(),startAt:start.toISOString(),endAt:end.toISOString(),allDay:!!input.allDay,recurrence:event.recurrence,version:undefined},db,actor);saveEvent({...event,recurrence:untilRule(event.recurrence,new Date(new Date(original).getTime()-1000).toISOString()),version:event.version},db,actor);db.prepare("DELETE FROM event_occurrences WHERE event_id=? AND original_start_at>=?").run(id,original);return {event:successor,scope,originalStartAt:original};
}

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
  const context=actorInfo(actor),id=input.id||randomUUID(),text=required(input.text,"text",50000),source=["typed","voice","file","link","handwriting"].includes(input.source)?input.source:"typed",time=stamp();
  if(findOwned(db,"captures",id,context.workspaceId))throw Object.assign(new Error("Capture already exists"),{status:409});for(const assetId of (Array.isArray(input.assetIds)?input.assetIds:[]).slice(0,10))if(!getAsset(String(assetId),db,context.workspaceId))throw Object.assign(new Error(`Asset not found: ${assetId}`),{status:404});db.prepare("INSERT INTO captures(id,text,source,status,source_label,objects_json,created_at,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?,?,?)").run(id,text,source,"review",input.sourceLabel||"Typed capture","[]",time,time,context.workspaceId);attachAssets(id,input.assetIds,db,context.workspaceId);audit(db,"create","capture",id,text.slice(0,120),{op:"delete"},actor);const capture={id,text,source,status:"review",sourceLabel:input.sourceLabel||"Typed capture",objects:[],assets:assetsForCapture(id,db,context.workspaceId).map(asset=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size})),createdAt:time,version:1};runCaptureAutomations(capture,db,context.workspaceId);return capture;
}

export async function createFileCapture(file,db=getDatabase(),actor=null){
  const asset=await storeAsset({stream:file.stream,name:file.name,mime:file.type||"application/octet-stream"},loadConfig(),db,actorInfo(actor).workspaceId);
  return createCapture({text:file.name,source:"file",assetIds:[asset.id],sourceLabel:`${fileKind(file.type)} · ${formatSize(file.size)}`},db,actor);
}

export function updateCapture(id,status,version,db=getDatabase(),actor=null){
  if(!["queued","processing","review","confirmed","failed","dismissed"].includes(status))throw new Error("Invalid capture status");const context=actorInfo(actor),before=findOwned(db,"captures",id,context.workspaceId);if(!before)throw Object.assign(new Error("Capture not found"),{status:404});requireVersion({version},before,{db,type:"capture",actor});db.prepare(`UPDATE captures SET status=?,updated_at=?,version=version+1 WHERE id=?${context.workspaceId?" AND workspace_id=?":""}`).run(status,stamp(),id,...(context.workspaceId?[context.workspaceId]:[]));audit(db,"status","capture",id,status,{op:"capture-status",status:before.status},actor);return {ok:true,version:before.version+1};
}

const cleanTaskArguments=args=>({title:required(args.title,"task title",500),dueAt:args.dueAt?( /^\d{4}-\d{2}-\d{2}$/.test(args.dueAt)?args.dueAt:absolute(args.dueAt,"dueAt").toISOString()):null,project:args.project?required(args.project,"project",200):null,linkedActionId:args.linkedActionId?required(args.linkedActionId,"linked action id",100):null});
const cleanNoteArguments=args=>({title:required(args.title,"note title",500),content:String(args.content||"").slice(0,100000),tags:Array.isArray(args.tags)?args.tags.map(tag=>required(tag,"tag",100)).slice(0,20):[]});
const cleanVaultNoteArguments=args=>({sourceId:required(args.sourceId,"vault source",100),relativePath:required(args.relativePath,"vault note path",1000),title:required(args.title,"vault note title",500),content:String(args.content||"").slice(0,100000),tags:Array.isArray(args.tags)?args.tags.map(tag=>required(tag,"tag",100)).slice(0,20):[]});
function cleanEventArguments(args){const start=absolute(args.startAt,"startAt"),end=absolute(args.endAt,"endAt");if(end<=start){throw new Error("endAt must be after startAt")}eventPosition(start,required(args.timezone,"timezone",100));const reminders=(Array.isArray(args.reminders)?args.reminders:[]).map(item=>({offsetMinutes:Number(item.offsetMinutes)}));if(reminders.some(item=>!Number.isInteger(item.offsetMinutes)||item.offsetMinutes<0||item.offsetMinutes>525600)){throw new Error("Invalid reminder offset")}return {title:required(args.title,"event title",500),startAt:start.toISOString(),endAt:end.toISOString(),timezone:args.timezone,location:args.location?required(args.location,"location",500):null,reminders}}
const captureActionCleaners={"task.create":cleanTaskArguments,"event.create":cleanEventArguments,"note.create":cleanNoteArguments,"vault.note.create":cleanVaultNoteArguments};
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
  const id=randomUUID(),args=action.arguments||action;let type=action.type.split(".")[0],object;
  if(type==="task"){
    object=saveTask({id,title:args.title,project:args.project||"Inbox",due:args.dueAt||"No date",dueAt:args.dueAt||null,reminderAt:null,priority:"Medium"},db,actor);
    if(args.dueAt&&!args.linkedActionId){const allDay=/^\d{4}-\d{2}-\d{2}$/.test(args.dueAt),start=allDay?`${args.dueAt}T00:00:00.000Z`:args.dueAt,end=new Date(new Date(start).getTime()+(allDay?86400000:3600000)).toISOString(),event=saveEvent({title:args.title,startAt:start,endAt:end,timezone:loadConfig().timezone||"UTC",allDay,reminders:allDay?[]:[{offsetMinutes:30},{offsetMinutes:10},{offsetMinutes:0}]},db,actor);db.prepare("UPDATE tasks SET event_id=? WHERE id=?").run(event.id,object.id);db.prepare("UPDATE events SET task_id=? WHERE id=?").run(object.id,event.id);object=findOwned(db,"tasks",object.id,actorInfo(actor).workspaceId)}
  }
  else if(type==="event"){const reminder=action.arguments?.reminders?.[0],reminderAt=reminder?new Date(new Date(args.startAt).getTime()-reminder.offsetMinutes*60000).toISOString():null;object=saveEvent(action.arguments?{id,title:args.title,startAt:args.startAt,endAt:args.endAt,timezone:args.timezone,location:args.location,reminderAt}:{id,title:args.title,day:new Date().getDay(),time:"09:00",top:0,height:58},db,actor)}
  else if(action.type==="vault.note.create"){
    const assets=assetsForCapture(captureId,db,actorInfo(actor).workspaceId).filter(asset=>asset.mime.startsWith("image/")),root=sourceRoot(args.sourceId,actorInfo(actor).workspaceId,db),attachmentNoteId=randomUUID(),attachments=assets.map(asset=>{const path=`Attachments/Noema/${attachmentNoteId}/${asset.id}${extname(asset.name)||".img"}`;mkdirSync(dirname(join(root,path)),{recursive:true});copyFileSync(assetPath(asset.sha256),join(root,path));return {asset,path}}),content=[args.content||`# ${args.title}\n\n`,...attachments.map(({path})=>`![](${path})`)].join("\n\n"),vault=createVaultNote(args.sourceId,{relativePath:args.relativePath,content},actor,db),note=findOwned(db,"notes",vault.noteId,actorInfo(actor).workspaceId);
    for(const {asset,path} of attachments)db.prepare("INSERT INTO note_assets(note_id,asset_id,relative_path,workspace_id) VALUES(?,?,?,?)").run(note.id,asset.id,path,actorInfo(actor).workspaceId);
    object={...note,sourceId:args.sourceId,relativePath:vault.relativePath};type="vault-note";
  }else object=saveNote({id,title:args.title,content:args.content||args.detail||args.title,tags:args.tags||[],ai:true,source:`Capture ${captureId}`},db,actor);
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
    const objects=created.filter(({type})=>type!=="vault-note").flatMap(({type,object})=>type==="task"&&object.event_id?[{type,id:object.id},{type:"event",id:object.event_id}]:[{type,id:object.id}]);
    audit(db,"apply","capture",id,`Applied ${created.length} object(s) from capture`,{op:"delete-many",objects,vaultNotes:created.filter(({type})=>type==="vault-note").map(({object})=>({sourceId:object.sourceId,relativePath:object.relativePath})),captureStatus:"review"},actor);
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
  if(inverse.op==="delete-many"){for(const object of inverse.objects||[])if(objectTables[object.type]&&object.type!=="capture")deleteObject(db,object.type,object.id);for(const vaultNote of inverse.vaultNotes||[])trashVaultEntry(vaultNote.sourceId,vaultNote.relativePath,{workspaceId:event.workspace_id},db,true);if(inverse.captureStatus)db.prepare("UPDATE captures SET status=?,updated_at=?,version=version+1 WHERE id=?").run(inverse.captureStatus,stamp(),event.object_id);return}
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
  const q=required(query,"query",500).replace(/["']/g," ");return db.prepare(`SELECT n.* FROM notes_fts f JOIN notes n ON n.id=f.id WHERE notes_fts MATCH ? AND n.trashed=0${workspaceId?" AND n.workspace_id=?":""} ORDER BY rank LIMIT 50`).all(q,...(workspaceId?[workspaceId]:[])).map(row=>noteProjection(row,db));
}

export function noteVersions(noteId,db=getDatabase(),workspaceId=null){if(!findOwned(db,"notes",noteId,workspaceId))throw Object.assign(new Error("Note not found"),{status:404});return db.prepare("SELECT version,title,content,tags_json,created_at AS createdAt FROM note_versions WHERE note_id=? ORDER BY version DESC").all(noteId).map(row=>({...row,tags:parse(row.tags_json)}))}

export function restoreNoteVersion(noteId,version,db=getDatabase(),actor=null){const current=findOwned(db,"notes",noteId,actorInfo(actor).workspaceId);if(!current)throw Object.assign(new Error("Note not found"),{status:404});const snapshot=db.prepare("SELECT * FROM note_versions WHERE note_id=? AND version=?").get(noteId,Number(version));if(!snapshot)throw Object.assign(new Error("Note version not found"),{status:404});return saveNote({id:noteId,title:snapshot.title,content:snapshot.content,tags:parse(snapshot.tags_json),ai:!!current.ai,source:current.source,favorite:!!current.favorite,trashed:!!current.trashed,version:current.version},db,actor)}

export function importMarkdown(markdown,db=getDatabase(),actor=null){const content=required(markdown,"markdown",2_000_000),match=content.match(/^#\s+(.+)$/m),title=match?.[1].trim()||"Imported note";return saveNote({title,content,tags:[],source:"Markdown import"},db,actor)}

export function exportMarkdown(noteId,db=getDatabase(),workspaceId=null){const note=findOwned(db,"notes",noteId,workspaceId);if(!note)throw Object.assign(new Error("Note not found"),{status:404});return note.content.startsWith("# ")?note.content:`# ${note.title}\n\n${note.content}`}

export function requestNoteOptimization(noteId,mode="organize",db=getDatabase(),workspaceId=null){const note=findOwned(db,"notes",noteId,workspaceId,"AND trashed=0");if(!note)throw Object.assign(new Error("Note not found"),{status:404});if(!note.draft)throw new Error("Only Draft notes can be optimized");if(!["light","organize","study","technical","voice"].includes(mode))throw new Error("Unknown optimization mode");const id=randomUUID(),jobId=enqueueJob("note-optimize",{optimizationId:id,noteId,mode},db,workspaceId),time=stamp();db.prepare("INSERT INTO note_optimizations(id,note_id,job_id,mode,state,before_content,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,noteId,jobId,mode,"queued",note.content,time,time);return {id,jobId,state:"queued"}}
export const noteOptimizations=(noteId,db=getDatabase(),workspaceId=null)=>{if(!findOwned(db,"notes",noteId,workspaceId))throw Object.assign(new Error("Note not found"),{status:404});return db.prepare("SELECT * FROM note_optimizations WHERE note_id=? ORDER BY created_at DESC LIMIT 20").all(noteId).map(row=>({...row,operations:parse(row.changes_json)}))};
export function finishNoteOptimization(id,result,provider,db=getDatabase()){
  const proposal=db.prepare("SELECT o.before_content,n.version FROM note_optimizations o JOIN notes n ON n.id=o.note_id WHERE o.id=? AND o.state='queued'").get(id);
  if(!proposal)throw new Error("Optimization proposal is not queued");
  if(result.baseVersion!==proposal.version)throw new Error("Optimization base version does not match the note");
  const operations=[...result.operations].sort((a,b)=>b.start-a.start);let boundary=proposal.before_content.length,content=proposal.before_content;
  for(const operation of operations){if(operation.type!=="replace_range"||operation.start>operation.end||operation.end>boundary)throw new Error("Invalid or overlapping note optimization range");content=content.slice(0,operation.start)+operation.replacement+content.slice(operation.end);boundary=operation.start}
  const changed=db.prepare("UPDATE note_optimizations SET state='ready',after_content=?,summary=?,provider=?,base_version=?,changes_json=?,updated_at=? WHERE id=? AND state='queued'").run(content,String(result.summary||""),provider,result.baseVersion,JSON.stringify(result.operations),stamp(),id);
  if(!changed.changes)throw new Error("Optimization proposal is not queued");
}
export function failNoteOptimization(id,error,db=getDatabase()){db.prepare("UPDATE note_optimizations SET state='failed',error=?,updated_at=? WHERE id=? AND state='queued'").run(String(error).slice(0,2000),stamp(),id)}
export function applyNoteOptimization(id,db=getDatabase(),actor=null){const workspaceId=actorInfo(actor).workspaceId,proposal=db.prepare(`SELECT o.* FROM note_optimizations o JOIN notes n ON n.id=o.note_id WHERE o.id=? AND o.state='ready'${workspaceId?" AND n.workspace_id=?":""}`).get(id,...(workspaceId?[workspaceId]:[]));if(!proposal)throw Object.assign(new Error("Ready optimization not found"),{status:404});const note=findOwned(db,"notes",proposal.note_id,workspaceId);if(note.version!==proposal.base_version)throw Object.assign(new Error("Note changed after this optimization was created"),{status:409,code:"VERSION_CONFLICT"});db.exec("BEGIN IMMEDIATE");try{const saved=saveNote({id:note.id,title:note.title,content:proposal.after_content,tags:parse(note.tags_json),ai:true,draft:false,source:note.source,favorite:!!note.favorite,trashed:!!note.trashed,version:note.version},db,actor);db.prepare("UPDATE note_optimizations SET state='applied',applied_at=?,updated_at=? WHERE id=?").run(stamp(),stamp(),id);db.exec("COMMIT");return saved}catch(error){db.exec("ROLLBACK");throw error}}
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
