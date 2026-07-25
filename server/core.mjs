import {randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";

const stamp=()=>new Date().toISOString();
const parse=value=>{try{return JSON.parse(value)}catch{return []}};
const required=(value,name,max=10000)=>{if(typeof value!=="string"||!value.trim())throw new Error(`${name} is required`);if(value.length>max)throw new Error(`${name} is too long`);return value.trim()};
const requireVersion=(input,before)=>{if(before&&input.version!==before.version)throw Object.assign(new Error(`Expected version ${before.version}`),{status:409,code:"VERSION_CONFLICT"})};
const audit=(db,action,type,id,summary,inverse=null,actor=null)=>db.prepare("INSERT INTO audit_events(id,actor_id,action,object_type,object_id,summary,inverse_json,created_at) VALUES(?,?,?,?,?,?,?,?)").run(randomUUID(),actor,action,type,id,summary,inverse?JSON.stringify(inverse):null,stamp());

export function listState(db=getDatabase()){
  return {
    tasks:db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all().map(row=>({...row,completed:!!row.completed,archived:!!row.archived,subtasks:parse(row.subtasks_json)})),
    events:db.prepare("SELECT * FROM events ORDER BY day,time").all().map(row=>({...row,active:!!row.active})),
    notes:db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all().map(row=>({...row,ai:!!row.ai,favorite:!!row.favorite,trashed:!!row.trashed,tags:parse(row.tags_json),time:row.updated_at})),
    captures:db.prepare("SELECT * FROM captures ORDER BY created_at DESC").all().map(row=>({id:row.id,text:row.text,source:row.source,status:row.status,sourceLabel:row.source_label,objects:parse(row.objects_json),error:row.error,createdAt:row.created_at,version:row.version})),
  };
}

export function saveTask(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),title=required(input.title,"title",500),project=required(input.project||"Inbox","project",200),due=required(input.due||"No date","due",100),priority=["High","Medium","Low"].includes(input.priority)?input.priority:"Medium",time=stamp(),before=db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  requireVersion(input,before);
  db.prepare(`INSERT INTO tasks(id,title,project,due,priority,completed,recurrence,subtasks_json,archived,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,project=excluded.project,due=excluded.due,priority=excluded.priority,completed=excluded.completed,recurrence=excluded.recurrence,subtasks_json=excluded.subtasks_json,archived=excluded.archived,updated_at=excluded.updated_at,version=tasks.version+1`).run(id,title,project,due,priority,input.completed?1:0,input.recurrence||null,JSON.stringify(input.subtasks||[]),input.archived?1:0,before?.created_at||time,time);
  audit(db,before?"update":"create","task",id,title,before,actor);return db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
}

export function saveEvent(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),title=required(input.title,"title",500),day=Number(input.day),timeValue=required(input.time,"time",20),time=stamp(),before=db.prepare("SELECT * FROM events WHERE id=?").get(id);if(!Number.isInteger(day)||day<0||day>6)throw new Error("day must be between 0 and 6");
  requireVersion(input,before);
  db.prepare(`INSERT INTO events(id,title,day,time,top,height,location,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,day=excluded.day,time=excluded.time,top=excluded.top,height=excluded.height,location=excluded.location,active=excluded.active,updated_at=excluded.updated_at,version=events.version+1`).run(id,title,day,timeValue,Number(input.top)||0,Number(input.height)||58,input.location||null,input.active?1:0,before?.created_at||time,time);
  audit(db,before?"update":"create","event",id,title,before,actor);return db.prepare("SELECT * FROM events WHERE id=?").get(id);
}

export function saveNote(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),title=required(input.title,"title",500),content=String(input.content||""),time=stamp(),before=db.prepare("SELECT * FROM notes WHERE id=?").get(id),excerpt=String(input.excerpt||content.replace(/[#*_>-]/g,"").trim().slice(0,140));
  requireVersion(input,before);
  db.prepare(`INSERT INTO notes(id,title,excerpt,content,tags_json,ai,source,favorite,trashed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,tags_json=excluded.tags_json,ai=excluded.ai,source=excluded.source,favorite=excluded.favorite,trashed=excluded.trashed,updated_at=excluded.updated_at,version=notes.version+1`).run(id,title,excerpt,content,JSON.stringify(input.tags||[]),input.ai?1:0,input.source||null,input.favorite?1:0,input.trashed?1:0,before?.created_at||time,time);
  db.prepare("DELETE FROM notes_fts WHERE id=?").run(id);db.prepare("INSERT INTO notes_fts(id,title,content,tags) VALUES(?,?,?,?)").run(id,title,content,(input.tags||[]).join(" "));
  audit(db,before?"update":"create","note",id,title,before,actor);return db.prepare("SELECT * FROM notes WHERE id=?").get(id);
}

export function createCapture(input,db=getDatabase(),actor=null){
  const id=input.id||randomUUID(),text=required(input.text,"text",50000),source=["typed","voice","file","link"].includes(input.source)?input.source:"typed",time=stamp();
  db.prepare("INSERT INTO captures(id,text,source,status,source_label,objects_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,text,source,"review",input.sourceLabel||"Typed capture","[]",time,time);audit(db,"create","capture",id,text.slice(0,120),null,actor);return {id,text,source,status:"review",sourceLabel:input.sourceLabel||"Typed capture",objects:[],createdAt:time,version:1};
}

export function updateCapture(id,status,version,db=getDatabase(),actor=null){
  if(!["processing","review","confirmed","failed","dismissed"].includes(status))throw new Error("Invalid capture status");const before=db.prepare("SELECT * FROM captures WHERE id=?").get(id);if(!before)throw Object.assign(new Error("Capture not found"),{status:404});requireVersion({version},before);db.prepare("UPDATE captures SET status=?,updated_at=?,version=version+1 WHERE id=?").run(status,stamp(),id);audit(db,"status","capture",id,status,{status:before.status},actor);return {ok:true,version:before.version+1};
}

export function saveInterpretation(id,objects,db=getDatabase()){
  if(!Array.isArray(objects))throw new Error("Interpretation objects must be an array");const cleaned=objects.slice(0,20).map(object=>({type:["task","event","note"].includes(object.type)?object.type:"note",title:required(object.title,"object title",500),detail:String(object.detail||"").slice(0,1000)}));const result=db.prepare("UPDATE captures SET status='review',objects_json=?,error=NULL,updated_at=?,version=version+1 WHERE id=?").run(JSON.stringify(cleaned),stamp(),id);if(!result.changes)throw new Error("Capture not found");return cleaned;
}

export function searchNotes(query,db=getDatabase()){
  const q=required(query,"query",500).replace(/["']/g," ");return db.prepare("SELECT n.* FROM notes_fts f JOIN notes n ON n.id=f.id WHERE notes_fts MATCH ? AND n.trashed=0 ORDER BY rank LIMIT 50").all(q);
}
