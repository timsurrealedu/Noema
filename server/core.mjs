import {randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {assetsForCapture,attachAssets,storeAsset} from "./objects.mjs";
import {loadConfig} from "./config.mjs";

const stamp=()=>new Date().toISOString();
const formatSize=bytes=>bytes>1024*1024?`${(bytes/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
const fileKind=type=>type?.startsWith("image/")?"Image":type?.startsWith("audio/")?"Audio":type?.startsWith("text/")?"Text":type==="application/pdf"?"Document":type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"?"Document":"File";
const parse=value=>{try{return JSON.parse(value)}catch{return []}};
const required=(value,name,max=10000)=>{if(typeof value!=="string"||!value.trim())throw new Error(`${name} is required`);if(value.length>max)throw new Error(`${name} is too long`);return value.trim()};
const requireVersion=(input,before)=>{if(before&&input.version!==before.version)throw Object.assign(new Error(`Expected version ${before.version}`),{status:409,code:"VERSION_CONFLICT"})};
const audit=(db,action,type,id,summary,inverse=null,actor=null)=>db.prepare("INSERT INTO audit_events(id,actor_id,action,object_type,object_id,summary,inverse_json,created_at) VALUES(?,?,?,?,?,?,?,?)").run(randomUUID(),actor,action,type,id,summary,inverse?JSON.stringify(inverse):null,stamp());
const objectTables={task:"tasks",event:"events",note:"notes",capture:"captures",project:"projects"};
const insertRow=(db,table,row)=>{const columns=Object.keys(row);db.prepare(`INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(()=>"?").join(",")})`).run(...columns.map(column=>row[column]))};
const deleteObject=(db,type,id)=>{db.prepare(`DELETE FROM ${objectTables[type]} WHERE id=?`).run(id);if(type==="note")db.prepare("DELETE FROM notes_fts WHERE id=?").run(id)};
const reindexNote=(db,row)=>{db.prepare("DELETE FROM notes_fts WHERE id=?").run(row.id);db.prepare("INSERT INTO notes_fts(id,title,content,tags) VALUES(?,?,?,?)").run(row.id,row.title,row.content,parse(row.tags_json).join(" "))};

export function listState(db=getDatabase()){
  return {
    tasks:db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all().map(row=>({...row,completed:!!row.completed,archived:!!row.archived,subtasks:parse(row.subtasks_json)})),
    events:db.prepare("SELECT * FROM events ORDER BY day,time").all().map(row=>({...row,active:!!row.active})),
    notes:db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all().map(row=>({...row,ai:!!row.ai,favorite:!!row.favorite,trashed:!!row.trashed,tags:parse(row.tags_json),time:row.updated_at})),
    captures:db.prepare("SELECT * FROM captures ORDER BY created_at DESC").all().map(row=>({id:row.id,text:row.text,source:row.source,status:row.status,sourceLabel:row.source_label,objects:parse(row.objects_json),error:row.error,assets:assetsForCapture(row.id,db).map(asset=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size})),createdAt:row.created_at,version:row.version})),
    projects:db.prepare("SELECT * FROM projects ORDER BY name").all(),
    taskDependencies:db.prepare("SELECT task_id AS taskId,depends_on_task_id AS dependsOnTaskId,created_at AS createdAt FROM task_dependencies").all(),
    noteLinks:db.prepare("SELECT source_note_id AS sourceNoteId,target_note_id AS targetNoteId,link_text AS linkText,created_at AS createdAt FROM note_links").all(),
  };
}

export function saveTask(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),title=required(input.title,"title",500),project=required(input.project||"Inbox","project",200),due=required(input.due||"No date","due",100),priority=["High","Medium","Low"].includes(input.priority)?input.priority:"Medium",time=stamp(),before=db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  requireVersion(input,before);
  db.prepare(`INSERT INTO tasks(id,title,project,due,priority,completed,recurrence,subtasks_json,archived,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,project=excluded.project,due=excluded.due,priority=excluded.priority,completed=excluded.completed,recurrence=excluded.recurrence,subtasks_json=excluded.subtasks_json,archived=excluded.archived,updated_at=excluded.updated_at,version=tasks.version+1`).run(id,title,project,due,priority,input.completed?1:0,input.recurrence||null,JSON.stringify(input.subtasks||[]),input.archived?1:0,before?.created_at||time,time);
  audit(db,before?"update":"create","task",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);return db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
}

export function saveEvent(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),title=required(input.title,"title",500),day=Number(input.day),timeValue=required(input.time,"time",20),time=stamp(),before=db.prepare("SELECT * FROM events WHERE id=?").get(id);if(!Number.isInteger(day)||day<0||day>6)throw new Error("day must be between 0 and 6");
  requireVersion(input,before);
  db.prepare(`INSERT INTO events(id,title,day,time,top,height,location,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,day=excluded.day,time=excluded.time,top=excluded.top,height=excluded.height,location=excluded.location,active=excluded.active,updated_at=excluded.updated_at,version=events.version+1`).run(id,title,day,timeValue,Number(input.top)||0,Number(input.height)||58,input.location||null,input.active?1:0,before?.created_at||time,time);
  audit(db,before?"update":"create","event",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);return db.prepare("SELECT * FROM events WHERE id=?").get(id);
}

export function saveNote(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),title=required(input.title,"title",500),content=String(input.content||""),time=stamp(),before=db.prepare("SELECT * FROM notes WHERE id=?").get(id),excerpt=String(input.excerpt||content.replace(/[#*_>-]/g,"").trim().slice(0,140));
  requireVersion(input,before);
  db.prepare(`INSERT INTO notes(id,title,excerpt,content,tags_json,ai,source,favorite,trashed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,tags_json=excluded.tags_json,ai=excluded.ai,source=excluded.source,favorite=excluded.favorite,trashed=excluded.trashed,updated_at=excluded.updated_at,version=notes.version+1`).run(id,title,excerpt,content,JSON.stringify(input.tags||[]),input.ai?1:0,input.source||null,input.favorite?1:0,input.trashed?1:0,before?.created_at||time,time);
  db.prepare("DELETE FROM notes_fts WHERE id=?").run(id);db.prepare("INSERT INTO notes_fts(id,title,content,tags) VALUES(?,?,?,?)").run(id,title,content,(input.tags||[]).join(" "));
  reindexNoteLinks(id,content,db);
  const saved=db.prepare("SELECT * FROM notes WHERE id=?").get(id);db.prepare("INSERT INTO note_versions(note_id,version,title,content,tags_json,created_at) VALUES(?,?,?,?,?,?)").run(id,saved.version,title,content,saved.tags_json,time);
  audit(db,before?"update":"create","note",id,title,before?{op:"restore",row:before}:{op:"delete"},actor);return saved;
}

export function createCapture(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),text=required(input.text,"text",50000),source=["typed","voice","file","link"].includes(input.source)?input.source:"typed",time=stamp();
  db.prepare("INSERT INTO captures(id,text,source,status,source_label,objects_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,text,source,"review",input.sourceLabel||"Typed capture","[]",time,time);attachAssets(id,input.assetIds,db);audit(db,"create","capture",id,text.slice(0,120),{op:"delete"},actor);return {id,text,source,status:"review",sourceLabel:input.sourceLabel||"Typed capture",objects:[],assets:assetsForCapture(id,db).map(asset=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size})),createdAt:time,version:1};
}

export async function createFileCapture(file,db=getDatabase(),actor=null){
  const asset=await storeAsset({stream:file.stream,name:file.name,mime:file.type||"application/octet-stream"},loadConfig(),db);
  return createCapture({text:file.name,source:"file",assetIds:[asset.id],sourceLabel:`${fileKind(file.type)} · ${formatSize(file.size)}`},db,actor);
}

export function updateCapture(id,status,version,db=getDatabase(),actor=null){
  if(!["processing","review","confirmed","failed","dismissed"].includes(status))throw new Error("Invalid capture status");const before=db.prepare("SELECT * FROM captures WHERE id=?").get(id);if(!before)throw Object.assign(new Error("Capture not found"),{status:404});requireVersion({version},before);db.prepare("UPDATE captures SET status=?,updated_at=?,version=version+1 WHERE id=?").run(status,stamp(),id);audit(db,"status","capture",id,status,{op:"capture-status",status:before.status},actor);return {ok:true,version:before.version+1};
}

export function saveInterpretation(id,objects,db=getDatabase()){
  if(!Array.isArray(objects))throw new Error("Interpretation objects must be an array");const cleaned=objects.slice(0,20).map(object=>({type:["task","event","note"].includes(object.type)?object.type:"note",title:required(object.title,"object title",500),detail:String(object.detail||"").slice(0,1000)}));const result=db.prepare("UPDATE captures SET status='review',objects_json=?,error=NULL,updated_at=?,version=version+1 WHERE id=?").run(JSON.stringify(cleaned),stamp(),id);if(!result.changes)throw new Error("Capture not found");return cleaned;
}

export function applyCaptureInterpretation(id,db=getDatabase(),actor=null){
  const capture=db.prepare("SELECT * FROM captures WHERE id=?").get(id);if(!capture)throw Object.assign(new Error("Capture not found"),{status:404});
  if(capture.status==="confirmed")return {captureId:id,status:"confirmed",created:[]};if(capture.status!=="review")throw Object.assign(new Error(`Capture is ${capture.status}; only captures in review can be applied`),{status:409,code:"NOT_APPLICABLE"});
  const objects=parse(capture.objects_json);if(!objects.length)throw Object.assign(new Error("No interpreted objects to apply"),{status:409,code:"NOTHING_TO_APPLY"});
  const created=[];db.exec("BEGIN IMMEDIATE");
  try{
    for(const object of objects){
      const objectId=randomUUID();let row;
      if(object.type==="task")row=saveTask({id:objectId,title:object.title,project:"Inbox",due:"No date",priority:"Medium"},db,actor);
      else if(object.type==="event")row=saveEvent({id:objectId,title:object.title,day:new Date().getDay(),time:"09:00",top:0,height:58},db,actor);
      else row=saveNote({id:objectId,title:object.title,content:object.detail||object.title,tags:[],ai:true,source:`Capture ${id}`},db,actor);
      created.push({type:object.type,object:row});
    }
    db.prepare("UPDATE captures SET status='confirmed',updated_at=?,version=version+1 WHERE id=?").run(stamp(),id);
    audit(db,"apply","capture",id,`Applied ${created.length} object(s) from capture`,{op:"delete-many",objects:created.map(({type,object})=>({type,id:object.id})),captureStatus:"review"},actor);
    db.exec("COMMIT");
  }catch(error){db.exec("ROLLBACK");throw error}
  return {captureId:id,status:"confirmed",created};
}

export function listAuditEvents(limit=100,db=getDatabase()){
  const bounded=Math.min(Math.max(Number(limit)||100,1),500);
  return db.prepare("SELECT * FROM audit_events ORDER BY created_at DESC,rowid DESC LIMIT ?").all(bounded).map(row=>({id:row.id,actorId:row.actor_id,action:row.action,objectType:row.object_type,objectId:row.object_id,summary:row.summary,reversible:!!row.inverse_json,createdAt:row.created_at}));
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
  const event=db.prepare("SELECT * FROM audit_events WHERE id=?").get(auditId);if(!event)throw Object.assign(new Error("Audit event not found"),{status:404});
  const inverse=event.inverse_json?JSON.parse(event.inverse_json):null;if(!inverse)throw Object.assign(new Error("This action cannot be undone"),{status:409,code:"NOT_REVERSIBLE"});
  db.exec("BEGIN IMMEDIATE");
  try{applyInverse(db,event,inverse);audit(db,"undo",event.object_type,event.object_id,`Undo: ${event.summary}`,null,actor);db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}
  return {ok:true,undone:event.summary};
}

export function searchNotes(query,db=getDatabase()){
  const q=required(query,"query",500).replace(/["']/g," ");return db.prepare("SELECT n.* FROM notes_fts f JOIN notes n ON n.id=f.id WHERE notes_fts MATCH ? AND n.trashed=0 ORDER BY rank LIMIT 50").all(q);
}

export function noteVersions(noteId,db=getDatabase()){return db.prepare("SELECT version,title,content,tags_json,created_at AS createdAt FROM note_versions WHERE note_id=? ORDER BY version DESC").all(noteId).map(row=>({...row,tags:parse(row.tags_json)}))}

export function restoreNoteVersion(noteId,version,db=getDatabase(),actor=null){const snapshot=db.prepare("SELECT * FROM note_versions WHERE note_id=? AND version=?").get(noteId,Number(version));if(!snapshot)throw Object.assign(new Error("Note version not found"),{status:404});const current=db.prepare("SELECT * FROM notes WHERE id=?").get(noteId);if(!current)throw Object.assign(new Error("Note not found"),{status:404});return saveNote({id:noteId,title:snapshot.title,content:snapshot.content,tags:parse(snapshot.tags_json),ai:!!current.ai,source:current.source,favorite:!!current.favorite,trashed:!!current.trashed,version:current.version},db,actor)}

export function importMarkdown(markdown,db=getDatabase(),actor=null){const content=required(markdown,"markdown",2_000_000),match=content.match(/^#\s+(.+)$/m),title=match?.[1].trim()||"Imported note";return saveNote({title,content,tags:[],source:"Markdown import"},db,actor)}

export function exportMarkdown(noteId,db=getDatabase()){const note=db.prepare("SELECT title,content FROM notes WHERE id=?").get(noteId);if(!note)throw Object.assign(new Error("Note not found"),{status:404});return note.content.startsWith("# ")?note.content:`# ${note.title}\n\n${note.content}`}

export function searchAll(query,db=getDatabase()){const q=required(query,"query",500),like=`%${q.replace(/[\\%_]/g,"\\$&")}%`,limit=20;return {notes:searchNotes(q,db),tasks:db.prepare("SELECT id,title,project,due,updated_at AS updatedAt FROM tasks WHERE archived=0 AND (title LIKE ? ESCAPE '\\' OR project LIKE ? ESCAPE '\\') ORDER BY updated_at DESC LIMIT ?").all(like,like,limit),events:db.prepare("SELECT id,title,day,time,location,updated_at AS updatedAt FROM events WHERE title LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT ?").all(like,like,limit),projects:db.prepare("SELECT id,name,status,summary,updated_at AS updatedAt FROM projects WHERE name LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT ?").all(like,like,limit),captures:db.prepare("SELECT id,text,source,status,updated_at AS updatedAt FROM captures WHERE text LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT ?").all(like,limit)}}

export function saveProject(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),name=required(input.name,"name",200),time=stamp(),before=db.prepare("SELECT * FROM projects WHERE id=?").get(id);
  requireVersion(input,before);
  const status=["Active","Planned","Archived"].includes(input.status)?input.status:"Active";
  const summary=String(input.summary||"").slice(0,1000);
  db.prepare(`INSERT INTO projects(id,name,status,summary,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,summary=excluded.summary,updated_at=excluded.updated_at,version=projects.version+1`).run(id,name,status,summary,before?.created_at||time,time);
  audit(db,before?"update":"create","project",id,name,before?{op:"restore",row:before}:{op:"delete"},actor);
  return db.prepare("SELECT * FROM projects WHERE id=?").get(id);
}

export function deleteProject(id,db=getDatabase(),actor=null){
  const before=db.prepare("SELECT * FROM projects WHERE id=?").get(id);if(!before)throw Object.assign(new Error("Project not found"),{status:404});
  db.prepare("DELETE FROM projects WHERE id=?").run(id);
  audit(db,"delete","project",id,before.name,{op:"restore",row:before},actor);return {ok:true};
}

export function saveTaskDependency(taskId,dependsOnTaskId,db=getDatabase(),actor=null){
  if(taskId===dependsOnTaskId)throw Object.assign(new Error("A task cannot depend on itself"),{status:409});
  const task=db.prepare("SELECT id FROM tasks WHERE id=?").get(taskId);if(!task)throw Object.assign(new Error("Task not found"),{status:404});
  const dep=db.prepare("SELECT id FROM tasks WHERE id=?").get(dependsOnTaskId);if(!dep)throw Object.assign(new Error("Dependency task not found"),{status:404});
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

export function dependenciesForTask(taskId,db=getDatabase()){return db.prepare("SELECT depends_on_task_id AS dependsOnTaskId,created_at AS createdAt FROM task_dependencies WHERE task_id=?").all(taskId)}
export function dependentsForTask(taskId,db=getDatabase()){return db.prepare("SELECT task_id AS taskId,created_at AS createdAt FROM task_dependencies WHERE depends_on_task_id=?").all(taskId)}

const linkPattern=/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g;
export function noteLinks(content){const links=new Map();for(const match of String(content).matchAll(linkPattern)){const text=match[1].trim();if(text)links.set(text.toLowerCase(),text)}return [...links.values()]}

export function reindexNoteLinks(noteId,content,db=getDatabase()){
  db.prepare("DELETE FROM note_links WHERE source_note_id=?").run(noteId);
  const links=noteLinks(content),time=stamp();
  for(const text of links){
    const target=db.prepare("SELECT id FROM notes WHERE LOWER(title)=LOWER(?) AND trashed=0").get(text);
    if(target)db.prepare("INSERT OR IGNORE INTO note_links(source_note_id,target_note_id,link_text,created_at) VALUES(?,?,?,?)").run(noteId,target.id,text,time);
  }
}

export function linksForNote(noteId,db=getDatabase()){return db.prepare("SELECT target_note_id AS targetNoteId,link_text AS linkText,created_at AS createdAt FROM note_links WHERE source_note_id=?").all(noteId)}
export function backlinksForNote(noteId,db=getDatabase()){return db.prepare("SELECT source_note_id AS sourceNoteId,link_text AS linkText,created_at AS createdAt FROM note_links WHERE target_note_id=?").all(noteId)}
