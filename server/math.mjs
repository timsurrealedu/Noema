import {randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {enqueueJob} from "./jobs.mjs";

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const now=()=>new Date().toISOString();

export function requestMathContinuation(noteId,input,actor,db=getDatabase()){
  const note=db.prepare("SELECT id FROM notes WHERE id=? AND workspace_id=? AND trashed=0").get(String(noteId),actor.workspaceId);
  if(!note)throw fail("Note not found",404);
  const block=db.prepare("SELECT b.id FROM note_blocks b WHERE b.id=? AND b.note_id=? AND b.kind='ink'").get(String(input.blockId||""),noteId);
  if(!block)throw fail("Ink block not found",404);
  const key=`continue-math:${block.id}`,active=db.prepare("SELECT 1 FROM jobs WHERE dedupe_key=? AND state IN ('queued','claimed','running')").get(key);
  if(active)return {state:"queued"};
  const jobId=enqueueJob("continue-math",{noteId,blockId:block.id},db,actor.workspaceId,{dedupeKey:key,maxAttempts:2});
  return {jobId,state:"queued"};
}

export function listMathContinuations(noteId,workspaceId,db=getDatabase()){
  return db.prepare("SELECT * FROM math_continuations WHERE note_id=? AND workspace_id=? ORDER BY created_at DESC LIMIT 20").all(String(noteId),workspaceId).map(row=>({...row,assumptions:JSON.parse(row.assumptions_json||"[]")}));
}

export function resolveMathContinuation(id,action,workspaceId,db=getDatabase(),insertBlock=null){
  const row=db.prepare("SELECT * FROM math_continuations WHERE id=? AND workspace_id=? AND state='proposed'").get(String(id),workspaceId);
  if(!row)throw fail("Proposed math continuation not found",404);
  const time=now();
  if(action==="accept"){
    if(typeof insertBlock==="function")insertBlock(row,db);
    db.prepare("UPDATE math_continuations SET state='accepted',resolved_at=?,updated_at=? WHERE id=?").run(time,time,id);
  }else{
    db.prepare("UPDATE math_continuations SET state='dismissed',resolved_at=?,updated_at=? WHERE id=?").run(time,time,id);
  }
  return db.prepare("SELECT * FROM math_continuations WHERE id=?").get(id);
}
