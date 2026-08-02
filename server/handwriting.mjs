import {randomUUID} from "node:crypto";
import {existsSync,realpathSync,statSync} from "node:fs";
import {resolve,sep} from "node:path";
import {createCapture} from "./core.mjs";
import {getDatabase} from "./db.mjs";
import {enqueueJob} from "./jobs.mjs";
import {createVaultNote,listNoteBlocks,saveInkBlock} from "./vault.mjs";

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function title(value){const clean=String(value||"").trim();if(!clean||clean.length>200||/[\\/\0]/.test(clean))throw fail("A valid title is required");return clean}
function folder(source,value){const clean=String(value||"").replaceAll("\\","/").replace(/^\/+|\/+$/g,""),root=realpathSync(source.root_path),path=resolve(root,clean);if(!clean||!path.startsWith(root+sep)||!existsSync(path)||!statSync(path).isDirectory()||realpathSync(path)!==path)throw fail("Invalid vault path");return clean}
export function createHandwritingNote(input,actor,db=getDatabase()){
  if(!["quick","folder"].includes(input.mode))throw fail("Invalid handwriting mode");const source=db.prepare("SELECT * FROM vault_sources WHERE id=? AND workspace_id=? AND state='connected'").get(String(input.vaultSourceId||""),actor.workspaceId);if(!source)throw fail("Capture vault not found",404);
  const quick=input.mode==="quick",name=quick?`Handwriting ${new Date().toISOString().replace(/[:.]/g,"-")}`:title(input.title),directory=quick?"Drafts":folder(source,input.folder),path=`${directory}/${name}.md`,draft=Boolean(input.draft),state=quick||draft?"queued":"done",created=createVaultNote(source.id,{relativePath:path,content:`# ${name}\n\n`},actor,db),ink=saveInkBlock(created.noteId,{...input.ink,id:randomUUID(),queueOcr:false},actor,db),capture=createCapture({text:name,source:"handwriting",sourceLabel:"Handwritten note"},db,actor),time=new Date().toISOString(),blocks=listNoteBlocks(created.noteId,actor,db);
  db.prepare("UPDATE notes SET draft=? WHERE id=? AND workspace_id=?").run(Number(draft),created.noteId,actor.workspaceId);db.prepare("UPDATE captures SET status=? WHERE id=? AND workspace_id=?").run(state==="done"?"confirmed":state,capture.id,actor.workspaceId);db.prepare("INSERT INTO handwriting_intakes(id,workspace_id,note_id,capture_id,vault_source_id,original_path,mode,draft,state,ink_block_id,original_blocks_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(randomUUID(),actor.workspaceId,created.noteId,capture.id,source.id,path,input.mode,Number(draft),state==="queued"?"pending":"done",ink.id,JSON.stringify(blocks),time,time);return {noteId:created.noteId,captureId:capture.id,path,state};
}

export function processPendingHandwriting(workspaceId,db=getDatabase()){
  const rows=db.prepare("SELECT id,ink_block_id FROM handwriting_intakes WHERE workspace_id=? AND state='pending' ORDER BY created_at").all(workspaceId);let queued=0,skipped=0;for(const row of rows){const key=`handwriting-intake:${row.id}`,active=db.prepare("SELECT 1 FROM jobs WHERE dedupe_key=? AND state IN ('queued','claimed','running')").get(key);if(active){skipped++;continue}enqueueJob("handwriting-ocr",{blockId:row.ink_block_id},db,workspaceId,{dedupeKey:`handwriting-ocr:${row.ink_block_id}`,maxAttempts:3});queueHandwritingIntake(row.id,workspaceId,db);db.prepare("UPDATE handwriting_intakes SET state='queued',updated_at=? WHERE id=? AND state='pending'").run(new Date().toISOString(),row.id);queued++}return {queued,skipped}
}
export function queueHandwritingIntake(intakeId,workspaceId,db=getDatabase()){return enqueueJob("handwriting-intake",{intakeId},db,workspaceId,{dedupeKey:`handwriting-intake:${intakeId}`,maxAttempts:3})}
