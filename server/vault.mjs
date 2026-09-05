import {createHash,randomUUID} from "node:crypto";
import {existsSync,mkdirSync,readFileSync,readdirSync,realpathSync,renameSync,statSync,writeFileSync} from "node:fs";
import {basename,dirname,extname,isAbsolute,join,normalize,relative,resolve,sep} from "node:path";
import {saveNote,saveTask} from "./core.mjs";
import {getDatabase} from "./db.mjs";
import {enqueueJob} from "./jobs.mjs";

const now=()=>new Date().toISOString(),hash=value=>createHash("sha256").update(value).digest("hex");
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function safeRelativePath(value){const path=String(value||"").replaceAll("\\","/");if(!path||path.startsWith("/")||path.includes("\0")||path.split("/").some(part=>!part||part==="."||part===".."))throw fail("Invalid vault path");return path}
export function vaultPath(root,value,{mustExist=false}={}){const rel=safeRelativePath(value),base=realpathSync(root),target=resolve(base,rel);if(target!==base&&!target.startsWith(base+sep))throw fail("Vault path escapes its source");if(mustExist){const actual=realpathSync(target);if(actual!==target||!actual.startsWith(base+sep))throw fail("Vault symlinks are not allowed")}return target}
function markdownFiles(root,dir=root){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isSymbolicLink()||[".obsidian",".git",".trash"].includes(entry.name)?[]:entry.isDirectory()?markdownFiles(root,join(dir,entry.name)):entry.isFile()&&extname(entry.name).toLowerCase()===".md"?[relative(root,join(dir,entry.name)).replaceAll("\\","/")]:[])}
function inventoryFiles(root,dir=root){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isSymbolicLink()||[".obsidian",".git",".trash"].includes(entry.name)?[]:entry.isDirectory()?inventoryFiles(root,join(dir,entry.name)):entry.isFile()?[relative(root,join(dir,entry.name)).replaceAll("\\","/")]:[])}
export function lifeosMigrationInventory({vaultPath:rootPath,codeRoots=[]}){if(!isAbsolute(rootPath))throw fail("Vault root must be absolute");const root=realpathSync(rootPath);if(!statSync(root).isDirectory())throw fail("Vault root must be a directory");const notes=[],attachments=new Set(),wikilinks=new Set(),inkSidecars=[];for(const relativePath of markdownFiles(root)){const content=readFileSync(vaultPath(root,relativePath,{mustExist:true}),"utf8"),tasks=(content.match(/^\s*- \[[ xX]\]\s+.+$/gm)||[]).length;for(const match of content.matchAll(/!\[\[([^\]|#]+)(?:[^\]]*)\]\]/g))attachments.add(match[1].trim());for(const match of content.matchAll(/(?<!!)\[\[([^\]|#]+)(?:[^\]]*)\]\]/g))wikilinks.add(match[1].trim());notes.push({relativePath,tasks})}for(const relativePath of inventoryFiles(root))if(relativePath.toLowerCase().endsWith(".ink.json"))inkSidecars.push(relativePath);const roots=codeRoots.map(path=>{if(!isAbsolute(path))throw fail("Code root must be absolute");const root=realpathSync(path);if(!statSync(root).isDirectory())throw fail("Code root must be a directory");return {path:root,files:inventoryFiles(root).length}});return {notes,attachments:[...attachments].sort(),wikilinks:[...wikilinks].sort(),inkSidecars,codeRoots:roots,summary:{notes:notes.length,tasks:notes.reduce((count,note)=>count+note.tasks,0),attachments:attachments.size,wikilinks:wikilinks.size,inkSidecars:inkSidecars.length,codeRoots:roots.length}}}
export function convertLifeosInk(strokes){if(!Array.isArray(strokes)||strokes.length>2000)throw fail("Invalid LifeOS ink sidecar");const raw=strokes.map((stroke,index)=>{const source=stroke.tool==="pen"?stroke.points:[stroke.a,stroke.b],points=Array.isArray(source)?source.filter(point=>Number.isFinite(point?.x)&&Number.isFinite(point?.y)):[];if(!points.length)throw fail("Invalid LifeOS ink stroke");return {id:`lifeos-${index}`,tool:{rect:"rectangle",ruler:"pen"}[stroke.tool]||stroke.tool,color:/^#[0-9a-f]{6}$/i.test(stroke.color)?stroke.color:"#111827",width:Math.min(100,Math.max(.25,Number(stroke.size)||2)),points:points.map((point,position)=>({x:Number(point.x),y:Number(point.y),pressure:.5,time:position}))}}),points=raw.flatMap(stroke=>stroke.points),minX=Math.min(0,...points.map(point=>point.x)),minY=Math.min(0,...points.map(point=>point.y)),shifted=raw.map(stroke=>({...stroke,points:stroke.points.map(point=>({...point,x:point.x-minX,y:point.y-minY}))})),width=Math.max(1,...shifted.flatMap(stroke=>stroke.points.map(point=>point.x+stroke.width))),height=Math.max(1,...shifted.flatMap(stroke=>stroke.points.map(point=>point.y+stroke.width)));return validateStrokes({formatVersion:2,coordinateSpace:"world",width:Math.ceil(width),height:Math.ceil(height),strokes:shifted})}
export function importLifeosInkSidecars(sourceId,actor,db=getDatabase()){const source=sourceRow(sourceId,actor.workspaceId,db),inventory=lifeosMigrationInventory({vaultPath:source.root_path}),time=now();let imported=0,skipped=0;for(const jsonPath of inventory.inkSidecars){if(db.prepare("SELECT 1 FROM note_ink_blocks WHERE json_path=? LIMIT 1").get(jsonPath)){skipped++;continue}const imagePath=jsonPath.replace(/\.ink\.json$/i,".png"),entry=db.prepare("SELECT e.note_id,n.content FROM vault_entries e JOIN notes n ON n.id=e.note_id WHERE e.source_id=? AND e.deleted_at IS NULL AND (n.content LIKE ? OR n.content LIKE ?) LIMIT 1").get(sourceId,`%${imagePath}%`,`%${basename(imagePath)}%`);if(!entry){skipped++;continue}let converted;try{converted=convertLifeosInk(JSON.parse(readFileSync(vaultPath(source.root_path,jsonPath,{mustExist:true}),"utf8")))}catch{skipped++;continue}ensureNoteBlocks(entry.note_id,db);const id=randomUUID(),position=db.prepare("SELECT COALESCE(MAX(position),-1)+1 value FROM note_blocks WHERE note_id=?").get(entry.note_id).value;db.prepare("INSERT INTO note_blocks(id,note_id,position,kind,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id,entry.note_id,position,"ink",time,time);db.prepare("INSERT INTO note_ink_blocks(block_id,width,height,strokes_json,json_path,stroke_hash,ocr_status,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,converted.width,converted.height,converted.json,jsonPath,hash(converted.json),"unavailable",time);imported++}return {imported,skipped}}
function title(content,path){return content.match(/^---\r?\n[\s\S]*?^title:\s*["']?(.+?)["']?\s*$[\s\S]*?^---$/mi)?.[1]||content.match(/^#\s+(.+)$/m)?.[1]||basename(path,".md")}
function tags(content){
  if(!content||typeof content!=="string")return[];
  const set=new Set();
  const fmMatch=content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if(fmMatch){
    const yaml=fmMatch[1];
    const tagMatch=yaml.match(/^(?:tags|tag):\s*([\s\S]*?)(?=\n[a-z0-9_-]+:|$)/mi);
    if(tagMatch){
      const section=tagMatch[1].trim();
      if(section.startsWith("-")){
        for(const line of section.split(/\r?\n/)){
          const item=line.replace(/^\s*-\s*/,"").trim().replace(/^['"]|['"]$/g,"");
          if(item)set.add(item.replace(/^#/,""));
        }
      }else if(section.startsWith("[")){
        for(const item of section.replace(/^\[|\]$/g,"").split(",")){
          const cleaned=item.trim().replace(/^['"]|['"]$/g,"");
          if(cleaned)set.add(cleaned.replace(/^#/,""));
        }
      }else{
        for(const item of section.split(/[, \t]+/)){
          const cleaned=item.trim().replace(/^['"]|['"]$/g,"");
          if(cleaned)set.add(cleaned.replace(/^#/,""));
        }
      }
    }
  }
  for(const match of content.matchAll(/(?<=\s|^)#([a-zA-Z0-9_\-\/]+)(?=\s|$)/g)){
    const tag=match[1].trim();
    if(tag&&!/^\d+$/.test(tag))set.add(tag);
  }
  return Array.from(set);
}
function atomicWrite(path,content){mkdirSync(dirname(path),{recursive:true});const temporary=join(dirname(path),`.${basename(path)}.${randomUUID()}.tmp`);writeFileSync(temporary,content,{encoding:"utf8",mode:0o600,flag:"wx"});renameSync(temporary,path)}
function sourceRow(sourceId,workspaceId,db){const row=db.prepare("SELECT * FROM vault_sources WHERE id=? AND workspace_id=?").get(sourceId,workspaceId);if(!row)throw fail("Vault source not found",404);return row}
export function sourceRoot(sourceId,workspaceId,db=getDatabase()){return sourceRow(sourceId,workspaceId,db).root_path}
export function connectVault({rootPath,name="Obsidian",taskFolders=["TODO/"]},workspaceId,db=getDatabase()){if(!isAbsolute(rootPath))throw fail("Vault root must be absolute");const root=realpathSync(rootPath);if(!statSync(root).isDirectory())throw fail("Vault root must be a directory");const folders=taskFolders.map(v=>safeRelativePath(String(v).replace(/\/$/,""))+"/");const existing=db.prepare("SELECT * FROM vault_sources WHERE workspace_id=? AND root_path=?").get(workspaceId,root),time=now(),id=existing?.id||randomUUID();if(existing)db.prepare("UPDATE vault_sources SET name=?,task_folders_json=?,state='connected',updated_at=? WHERE id=?").run(name,JSON.stringify(folders),time,id);else db.prepare("INSERT INTO vault_sources(id,workspace_id,name,root_path,task_folders_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(id,workspaceId,name,root,JSON.stringify(folders),time,time);return getVaultSource(id,workspaceId,db)}
export function getVaultSource(id,workspaceId,db=getDatabase()){const row=sourceRow(id,workspaceId,db);return {...row,taskFolders:JSON.parse(row.task_folders_json),lastResult:row.last_result_json?JSON.parse(row.last_result_json):null}}
export function listVaultSources(workspaceId,db=getDatabase()){return db.prepare("SELECT id FROM vault_sources WHERE workspace_id=? ORDER BY name").all(workspaceId).map(row=>getVaultSource(row.id,workspaceId,db))}
function cleanTag(str){return String(str||"").replace(/^#+/,"").replace(/[^a-zA-Z0-9_\-]/g,"").toLowerCase()}
function humanize(str){if(!str)return "";let s=String(str).replace(/([a-z])([A-Z])/g,"$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g,"$1 $2");s=s.replace(/^(SEM|Sem|Semester)(\d+)$/i,"Semester $2");return s.trim()}
export function ensureVaultMOCs(sourceId,relativePath,input={},actor,db=getDatabase()){
  const source=sourceRow(sourceId,actor.workspaceId,db),root=source.root_path;
  const parts=safeRelativePath(relativePath).split("/");
  const fileName=parts.pop();
  const noteTitle=input.title||title(input.content||"",fileName)||basename(fileName,".md");
  if(fileName.toLowerCase().includes("moc")||fileName===`${parts[parts.length-1]}.md`)return;
  const subGroupFolders=new Set(["kelas","class","lecture","lab","laboratory","uts","uas","exam","quiz","post-uts","pre-uts","review","session","session1","session2","session3","session4","session5","session6","session7","session8","session9","session10","session11","session12","session13","session14"]);
  let courseFolderIndex=parts.length-1;
  while(courseFolderIndex>0&&(subGroupFolders.has(parts[courseFolderIndex].toLowerCase())||/^session\s*\d+$/i.test(parts[courseFolderIndex])||/^week\s*\d+$/i.test(parts[courseFolderIndex]))){
    courseFolderIndex--;
  }
  let section="## 📚 Class notes (Kelas)";
  const fullPathLower=relativePath.toLowerCase();
  if(fullPathLower.includes("/lab/")||fullPathLower.includes("/lab"))section="## 🧪 Lab";
  else if(fullPathLower.includes("/uts/")||fullPathLower.includes("/uas/")||fullPathLower.includes("/exam/"))section="## 📝 Exam";
  else if(fullPathLower.includes("idea"))section="## Bank";
  else if(fullPathLower.includes("trading")||fullPathLower.includes("report"))section="## Reports";
  let parentMocTitle="Home";
  for(let i=0;i<=courseFolderIndex;i++){
    const dirRel=parts.slice(0,i+1).join("/");
    const dirName=parts[i];
    const dirAbs=join(root,dirRel);
    if(!existsSync(dirAbs))mkdirSync(dirAbs,{recursive:true});
    const files=readdirSync(dirAbs).filter(f=>f.endsWith(".md"));
    let mocFile=files.find(f=>{
      const base=basename(f,".md").toLowerCase(),dirLower=dirName.toLowerCase();
      return base===dirLower||base===humanize(dirName).toLowerCase()||base==="moc"||base==="index"||(dirLower.startsWith("sem")&&base.startsWith("sem"));
    });
    let mocRelPath,mocTitle,mocAbsPath;
    if(mocFile){
      mocRelPath=`${dirRel}/${mocFile}`;
      mocAbsPath=join(root,mocRelPath);
      mocTitle=basename(mocFile,".md");
    }else{
      const isSemester=/^sem(\d+)$/i.test(dirName)||/^semester\s*(\d+)$/i.test(dirName);
      const isUniversity=i===0&&/^(university|college|kuliah|studies|academics)$/i.test(dirName);
      const isInstitution=(i===1&&/^(university|college|kuliah)$/i.test(parts[0].toLowerCase()))||/^(binus|mit|harvard|stanford|itb|ui|ugm)$/i.test(dirName);
      const isPersonal=/^(personal|life|journal)$/i.test(dirName);
      const isTrading=/^(trading|stocks|crypto|finance)$/i.test(dirName);
      let emoji="🗺️",tagsList=["moc"],secName="## Notes";
      if(isSemester){
        const numMatch=dirName.match(/\d+/),semNum=numMatch?numMatch[0]:"";
        emoji="📗";mocTitle=`Semester ${semNum} — Map of Content`;mocFile=`SEM ${semNum}.md`;tagsList.push("semester",`sem${semNum}`);secName="## Courses";
      }else if(isInstitution){
        emoji="🎓";mocTitle=`${dirName} — Map of Content`;mocFile=`${dirName}.md`;tagsList.push("university",cleanTag(dirName));secName="## Semesters";
      }else if(isUniversity){
        emoji="🎓";mocTitle="University — Map of Content";mocFile="University.md";tagsList.push("domain","university");secName="## Areas";
      }else if(isPersonal){
        emoji="🏠";mocTitle="Personal — Map of Content";mocFile="Personal.md";tagsList.push("domain","personal");secName="## Areas";
      }else if(isTrading){
        emoji="📈";mocTitle="Trading — Map of Content";mocFile="Trading.md";tagsList.push("domain","trading");secName="## Reports";
      }else{
        const hName=humanize(dirName);emoji="🗺️";mocTitle=`${hName} — Map of Content`;mocFile=`${hName}.md`;tagsList.push("course",cleanTag(dirName));secName="## 📚 Class notes (Kelas)";
      }
      mocRelPath=`${dirRel}/${mocFile}`;mocAbsPath=join(root,mocRelPath);
      const backlinkStr=parentMocTitle?`\n\n→ [[${parentMocTitle}]]\n`:"";
      const mocBody=`---\ntags: [${tagsList.join(", ")}]\n---\n# ${emoji} ${mocTitle}\n\nHub note for ${humanize(dirName)}.\n\n${secName}\n-\n${backlinkStr}`;
      atomicWrite(mocAbsPath,mocBody);
    }
    if(i===courseFolderIndex){
      try{
        let content=readFileSync(mocAbsPath,"utf8");
        const link=`[[${noteTitle}]]`;
        if(!content.includes(link)&&!content.includes(`[[${basename(fileName,".md")}]]`)){
          if(content.includes(section)){
            const secIdx=content.indexOf(section)+section.length;
            content=content.slice(0,secIdx)+`\n- ${link}`+content.slice(secIdx);
          }else{
            const backlinkIdx=content.indexOf("→ [[");
            if(backlinkIdx>-1)content=content.slice(0,backlinkIdx)+`\n${section}\n- ${link}\n\n`+content.slice(backlinkIdx);
            else content=content+`\n\n${section}\n- ${link}\n`;
          }
          content=content.replace(/-\s*\n\s*- \[\[/g,"- [[");
          atomicWrite(mocAbsPath,content);
        }
      }catch{}
    }else{
      const nextDirName=parts[i+1],nextHuman=humanize(nextDirName),nextIsSemester=/^sem(\d+)$/i.test(nextDirName)||/^semester\s*(\d+)$/i.test(nextDirName);
      const nextSemNum=nextDirName.match(/\d+/)?.[0];
      const childLinkName=nextIsSemester?`SEM ${nextSemNum}`:nextHuman;
      const childLink=`[[${childLinkName}]]`;
      try{
        let content=readFileSync(mocAbsPath,"utf8");
        if(!content.includes(childLink)&&!content.includes(`[[${nextDirName}]]`)){
          const secToUse=nextIsSemester?"## Semesters":"## Courses";
          if(content.includes(secToUse)){
            const secIdx=content.indexOf(secToUse)+secToUse.length;
            content=content.slice(0,secIdx)+`\n- ${childLink}`+content.slice(secIdx);
          }else{
            const backlinkIdx=content.indexOf("→ [[");
            if(backlinkIdx>-1)content=content.slice(0,backlinkIdx)+`\n${secToUse}\n- ${childLink}\n\n`+content.slice(backlinkIdx);
            else content=content+`\n\n${secToUse}\n- ${childLink}\n`;
          }
          content=content.replace(/-\s*\n\s*- \[\[/g,"- [[");
          atomicWrite(mocAbsPath,content);
        }
      }catch{}
    }
    parentMocTitle=basename(mocFile||"",".md").replace(/\s*—\s*Map of Content/i,"").trim()||dirName;
  }
  return parentMocTitle;
}
export function updateVaultSource(id,input,workspaceId,db=getDatabase()){const source=sourceRow(id,workspaceId,db),name=String(input.name||source.name).trim();if(!name||name.length>200)throw fail("Vault source name is required");const folders=(input.taskFolders??JSON.parse(source.task_folders_json)).map(value=>safeRelativePath(String(value).replace(/\/$/,""))+"/");db.prepare("UPDATE vault_sources SET name=?,task_folders_json=?,updated_at=? WHERE id=?").run(name,JSON.stringify([...new Set(folders)]),now(),id);return getVaultSource(id,workspaceId,db)}
export function createVaultNote(sourceId,input,actor,db=getDatabase()){
  const source=sourceRow(sourceId,actor.workspaceId,db),proposedPath=safeRelativePath(String(input.relativePath||""));
  if(extname(proposedPath).toLowerCase()!==".md")throw fail("Vault note path must end in .md");
  const relativePath=input.uniqueName===true?resolveVaultNotePath(sourceId,proposedPath,actor.workspaceId,db):proposedPath;
  const path=vaultPath(source.root_path,relativePath);
  if(existsSync(path))throw fail("Vault note already exists",409);
  const heading=basename(relativePath,".md").replaceAll("-"," ");
  let content=String(input.content||`# ${heading}\n\n`);
  const noteTags=Array.isArray(input.tags)?input.tags.map(t=>String(t).replace(/^#+/,"").trim()).filter(Boolean):[];
  if(noteTags.length>0){
    if(!content.startsWith("---")){
      content=`---\ntags: [${noteTags.join(", ")}]\n---\n${content}`;
    }else{
      const fmMatch=content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if(fmMatch&&!/(?:tags|tag):/i.test(fmMatch[1])){
        content=content.replace(/^---\r?\n/,`---\ntags: [${noteTags.join(", ")}]\n`);
      }
    }
  }
  if(Buffer.byteLength(content)>2_000_000)throw fail("Vault note is too large");
  mkdirSync(dirname(path),{recursive:true});
  try{writeFileSync(path,content,{encoding:"utf8",mode:0o600,flag:"wx"})}catch(error){if(error.code==="EEXIST")throw fail("Vault note already exists",409);throw error}
  try{ensureVaultMOCs(sourceId,relativePath,{title:input.title||heading,content,tags:noteTags},actor,db)}catch{}
  scanVault(sourceId,actor,db);
  const entry=db.prepare("SELECT note_id FROM vault_entries WHERE source_id=? AND relative_path=? AND deleted_at IS NULL").get(sourceId,relativePath);
  return {noteId:entry.note_id,relativePath};
}
export function vaultTree(sourceId,workspaceId,db=getDatabase()){sourceRow(sourceId,workspaceId,db);const entries=db.prepare("SELECT relative_path,note_id,sync_state FROM vault_entries WHERE source_id=? AND deleted_at IS NULL ORDER BY relative_path").all(sourceId),root={name:"",path:"",folders:[],notes:[]};for(const entry of entries){const parts=entry.relative_path.split("/"),file=parts.pop();let node=root,path="";for(const part of parts){path=path?`${path}/${part}`:part;let next=node.folders.find(folder=>folder.name===part);if(!next){next={name:part,path,folders:[],notes:[]};node.folders.push(next)}node=next}node.notes.push({name:file,path:entry.relative_path,noteId:entry.note_id,syncState:entry.sync_state})}return root}
export function listVaultFolders(sourceId,workspaceId,db=getDatabase()){const root=realpathSync(sourceRow(sourceId,workspaceId,db).root_path),folders=[];function walk(path,relativePath,depth){if(depth>12||folders.length>=2000)return;for(const entry of readdirSync(path,{withFileTypes:true})){if(!entry.isDirectory()||entry.isSymbolicLink()||entry.name.startsWith("."))continue;const next=join(path,entry.name),rel=relativePath?`${relativePath}/${entry.name}`:entry.name;if(realpathSync(next)!==next)continue;folders.push(rel);walk(next,rel,depth+1)}}walk(root,"",0);return folders.sort()}
export function resolveVaultNotePath(sourceId,proposedPath,workspaceId,db=getDatabase()){
  const root=sourceRow(sourceId,workspaceId,db).root_path,folders=listVaultFolders(sourceId,workspaceId,db),byParent=new Map();
  for(const folder of folders){const segments=folder.split("/"),name=segments.pop(),parent=segments.join("/");let bucket=byParent.get(parent);if(!bucket){bucket=new Map();byParent.set(parent,bucket)}bucket.set(name.toLowerCase(),name)}
  const parts=safeRelativePath(proposedPath).split("/");let fileName=parts.pop();
  const resolved=[];for(const segment of parts)resolved.push(byParent.get(resolved.join("/"))?.get(segment.toLowerCase())||segment);
  const directory=resolved.length?`${resolved.join("/")}/`:"";
  try{const sibling=readdirSync(join(root,directory)).find(entry=>entry.toLowerCase()===fileName.toLowerCase());if(sibling)fileName=sibling}catch{}
  let target=`${directory}${fileName}`;
  if(!existsSync(vaultPath(root,target)))return target;
  const stem=fileName.slice(0,-3);
  for(let index=2;index<100;index++){const candidate=`${directory}${stem} (${index}).md`;if(!existsSync(vaultPath(root,candidate)))return candidate}
  throw fail("Vault note path could not be allocated",409);
}
export function scanVault(sourceId,actor,db=getDatabase()){
  const source=sourceRow(sourceId,actor.workspaceId,db),seen=new Set(),seenTaskLinks=new Set(),result={created:0,updated:0,written:0,unchanged:0,conflicts:0,tasks:0,removedTasks:0};
  for(const rel of markdownFiles(source.root_path)){seen.add(rel);const path=vaultPath(source.root_path,rel,{mustExist:true}),vaultContent=readFileSync(path,"utf8"),vaultHash=hash(vaultContent);let entry=db.prepare("SELECT * FROM vault_entries WHERE source_id=? AND relative_path=?").get(sourceId,rel);
    if(!entry){const mapped=db.prepare("SELECT * FROM notes WHERE workspace_id=? AND source=?").get(actor.workspaceId,`Obsidian · ${rel}`),note=mapped||saveNote({title:title(vaultContent,rel),content:vaultContent,tags:tags(vaultContent),source:`Obsidian · ${rel}`},db,actor),time=now();db.prepare("INSERT INTO vault_entries(id,source_id,relative_path,parent_path,note_id,vault_hash,noema_hash,last_common_content,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(randomUUID(),sourceId,rel,dirname(rel)==="."?"":dirname(rel),note.id,vaultHash,hash(vaultContent),vaultContent,time,time);result.created++;
    }else{const note=db.prepare("SELECT * FROM notes WHERE id=? AND workspace_id=?").get(entry.note_id,actor.workspaceId),vaultChanged=vaultHash!==entry.vault_hash,noemaChanged=note&&hash(note.content)!==entry.noema_hash;
      if(vaultChanged&&noemaChanged){if(!db.prepare("SELECT 1 FROM vault_conflicts WHERE entry_id=? AND state='open'").get(entry.id))db.prepare("INSERT INTO vault_conflicts(id,entry_id,vault_content,noema_content,base_content,created_at) VALUES(?,?,?,?,?,?)").run(randomUUID(),entry.id,vaultContent,note.content,entry.last_common_content,now());db.prepare("UPDATE vault_entries SET sync_state='conflict',updated_at=? WHERE id=?").run(now(),entry.id);result.conflicts++}
      else if(vaultChanged){saveNote({id:note.id,title:title(vaultContent,rel),content:vaultContent,tags:tags(vaultContent),source:`Obsidian · ${rel}`,version:note.version},db,actor);db.prepare("UPDATE vault_entries SET vault_hash=?,noema_hash=?,last_common_content=?,sync_state='synced',updated_at=? WHERE id=?").run(vaultHash,vaultHash,vaultContent,now(),entry.id);result.updated++}
      else if(noemaChanged){atomicWrite(path,note.content);const next=hash(note.content);db.prepare("UPDATE vault_entries SET vault_hash=?,noema_hash=?,last_common_content=?,sync_state='synced',updated_at=? WHERE id=?").run(next,next,note.content,now(),entry.id);result.written++}else result.unchanged++;
    }
    result.tasks+=syncTasks(source,rel,db,actor,seenTaskLinks);
    db.prepare("INSERT INTO vault_sync_manifests(source_id,relative_path,sha256,scanned_at) VALUES(?,?,?,?) ON CONFLICT(source_id,relative_path) DO UPDATE SET sha256=excluded.sha256,scanned_at=excluded.scanned_at").run(sourceId,rel,vaultHash,now());
  }
  for(const link of db.prepare("SELECT task_id,relative_path,block_id FROM vault_task_links WHERE source_id=?").all(sourceId))if(!seenTaskLinks.has(`${link.relative_path}\0${link.block_id}`)){db.prepare("UPDATE tasks SET archived=1,status='cancelled',updated_at=?,version=version+1 WHERE id=? AND archived=0").run(now(),link.task_id);db.prepare("UPDATE vault_task_links SET line_number=0,updated_at=? WHERE task_id=?").run(now(),link.task_id);result.removedTasks++}
  for(const entry of db.prepare("SELECT id,relative_path FROM vault_entries WHERE source_id=? AND deleted_at IS NULL").all(sourceId))if(!seen.has(entry.relative_path))db.prepare("UPDATE vault_entries SET sync_state='missing',deleted_at=?,updated_at=? WHERE id=?").run(now(),now(),entry.id);
  db.prepare("UPDATE vault_sources SET state='connected',last_sync_at=?,last_result_json=?,updated_at=? WHERE id=?").run(now(),JSON.stringify(result),now(),sourceId);return result;
}
const months={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
export function parseVaultTask(line,path,currentYear=new Date().getFullYear()){
  const match=line.match(/^(\s*- \[([ xX])\]\s+)(.*?)\s*$/);if(!match)return null;let text=match[3],block=text.match(/(?:^|\s)\^([A-Za-z0-9-]+)$/),reminder=null,dueAt=null,scheduledStartAt=null;if(block)text=text.slice(0,block.index).trim();
  const date=text.match(/(?:^|\s)(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?(?:\s+(\d{1,2}):(\d{2}))?(?=\s|$)/),month=date&&months[date[2].toLowerCase()];
  if(date&&month!==undefined){const pathYear=path.match(/(?:^|\/)((?:19|20)\d{2})(?:\/|$)/)?.[1],year=Number(date[3]||pathYear||currentYear),day=Number(date[1]),hour=Number(date[4]||0),minute=Number(date[5]||0),iso=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00+07:00`,value=new Date(iso),parts=Number.isNaN(value.getTime())?null:Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",hourCycle:"h23"}).formatToParts(value).map(part=>[part.type,Number(part.value)]));if(parts&&parts.year===year&&parts.month===month+1&&parts.day===day&&parts.hour===hour&&parts.minute===minute){dueAt=value.toISOString();scheduledStartAt=date[4]?dueAt:null;text=(text.slice(0,date.index)+" "+text.slice(date.index+date[0].length)).trim()}}
  const remind=text.match(/(?:^|\s)#remind(\d+)(?=\s|$)/i),minutes=remind&&Number(remind[1]);if(dueAt&&remind&&Number.isInteger(minutes)&&minutes>=0&&minutes<=525600){reminder=minutes;text=text.replace(remind[0]," ").trim()}
  const taskTitle=text.replace(/\s+/g," ").trim();if(!taskTitle)return null;
  return {completed:match[2].toLowerCase()==="x",title:taskTitle,blockId:block?.[1]||null,dueAt,scheduledStartAt,reminderMinutes:reminder,prefix:match[1]}}
function syncTasks(source,rel,db,actor,seenTaskLinks){if(!JSON.parse(source.task_folders_json).some(folder=>rel.startsWith(folder)))return 0;const path=vaultPath(source.root_path,rel,{mustExist:true});let content=readFileSync(path,"utf8"),eol=content.includes("\r\n")?"\r\n":"\n",lines=content.split(/\r?\n/),changed=false,count=0;for(let index=0;index<lines.length;index++){const parsed=parseVaultTask(lines[index],rel);if(!parsed)continue;let blockId=parsed.blockId;if(!blockId){blockId=`noema-${hash(`${rel}:${lines[index]}:${index}`).slice(0,12)}`;lines[index]+=` ^${blockId}`;changed=true}let existing=db.prepare("SELECT * FROM vault_task_links WHERE source_id=? AND relative_path=? AND block_id=?").get(source.id,rel,blockId)||db.prepare("SELECT * FROM vault_task_links WHERE source_id=? AND block_id=?").get(source.id,blockId);if(existing&&existing.relative_path!==rel){db.prepare("UPDATE vault_task_links SET relative_path=? WHERE source_id=? AND relative_path=? AND block_id=?").run(rel,source.id,existing.relative_path,blockId);existing={...existing,relative_path:rel}}seenTaskLinks.add(`${rel}\0${blockId}`);const taskId=existing?.task_id||randomUUID(),fingerprint=hash(lines[index]),reminderAt=parsed.reminderMinutes!=null&&(parsed.scheduledStartAt||parsed.dueAt)?new Date(new Date(parsed.scheduledStartAt||parsed.dueAt).getTime()-parsed.reminderMinutes*60000).toISOString():null,old=existing&&db.prepare("SELECT * FROM tasks WHERE id=?").get(taskId);if(!old||existing.source_fingerprint!==fingerprint||old.archived){saveTask({id:taskId,title:parsed.title,project:parsed.dueAt?"Obsidian":"Inbox",due:parsed.dueAt||"Someday",dueAt:parsed.dueAt,scheduledStartAt:parsed.scheduledStartAt,completed:parsed.completed,reminderAt,archived:false,version:old?.version},db,{...actor,skipVaultWriteback:true});db.prepare("INSERT INTO vault_task_links(source_id,relative_path,block_id,task_id,source_fingerprint,last_representation,line_number,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(source_id,relative_path,block_id) DO UPDATE SET task_id=excluded.task_id,source_fingerprint=excluded.source_fingerprint,last_representation=excluded.last_representation,line_number=excluded.line_number,updated_at=excluded.updated_at").run(source.id,rel,blockId,taskId,fingerprint,lines[index],index+1,now());count++}}
  if(changed)atomicWrite(path,lines.join(eol));return count}
export function listConflicts(sourceId,workspaceId,db=getDatabase()){sourceRow(sourceId,workspaceId,db);return db.prepare("SELECT c.*,e.relative_path FROM vault_conflicts c JOIN vault_entries e ON e.id=c.entry_id WHERE e.source_id=? AND c.state='open' ORDER BY c.created_at").all(sourceId)}
export function resolveConflict(id,resolution,actor,db=getDatabase()){if(!["vault","noema"].includes(resolution))throw fail("Resolution must be vault or noema");const row=db.prepare("SELECT c.*,e.relative_path,e.note_id,s.root_path FROM vault_conflicts c JOIN vault_entries e ON e.id=c.entry_id JOIN vault_sources s ON s.id=e.source_id WHERE c.id=? AND s.workspace_id=? AND c.state='open'").get(id,actor.workspaceId);if(!row)throw fail("Vault conflict not found",404);const content=resolution==="vault"?row.vault_content:row.noema_content,note=db.prepare("SELECT * FROM notes WHERE id=?").get(row.note_id);if(resolution==="vault")saveNote({id:note.id,title:title(content,row.relative_path),content,tags:tags(content),source:`Obsidian · ${row.relative_path}`,version:note.version},db,actor);else atomicWrite(vaultPath(row.root_path,row.relative_path),content);const digest=hash(content);db.prepare("UPDATE vault_entries SET vault_hash=?,noema_hash=?,last_common_content=?,sync_state='synced',updated_at=? WHERE id=?").run(digest,digest,content,now(),row.entry_id);db.prepare("UPDATE vault_conflicts SET state='resolved',resolution=?,resolved_at=? WHERE id=?").run(resolution,now(),id);return {id,resolution}}
export function validateStrokes(input){const formatVersion=input.formatVersion===2?2:1,coordinateSpace=formatVersion===2?"world":"canvas",width=Number(input.width),height=Number(input.height),strokes=input.strokes;if(input.coordinateSpace&&input.coordinateSpace!==coordinateSpace)throw fail("Invalid ink coordinate space");if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>10000||height>10000)throw fail("Invalid ink dimensions");if(!Array.isArray(strokes)||strokes.length>2000)throw fail("Invalid stroke count");let points=0;for(const stroke of strokes){if(!Array.isArray(stroke.points)||!stroke.points.length||stroke.points.length>10000)throw fail("Invalid stroke points");if(!["pen","highlighter","eraser","ruler","rectangle","ellipse","arrow"].includes(stroke.tool))throw fail("Invalid stroke tool");for(const point of stroke.points){points++;for(const key of ["x","y","pressure","time"]){if(!Number.isFinite(point[key]))throw fail("Invalid stroke point")}if(point.x<0||point.x>width||point.y<0||point.y>height||point.pressure<0||point.pressure>1)throw fail("Stroke point out of bounds")}}const json=JSON.stringify(strokes);if(points>100000||Buffer.byteLength(json)>5_000_000)throw fail("Ink payload too large");return {formatVersion,coordinateSpace,width,height,strokes,json}}
function smoothStrokePath(points){const first=points[0],last=points.at(-1);if(points.length===1)return `M${first.x.toFixed(2)} ${first.y.toFixed(2)}h.01`;if(points.length===2)return `M${first.x.toFixed(2)} ${first.y.toFixed(2)} L${last.x.toFixed(2)} ${last.y.toFixed(2)}`;let path=`M${first.x.toFixed(2)} ${first.y.toFixed(2)}`;for(let index=1;index<points.length-1;index++){const point=points[index],next=points[index+1];path+=` Q${point.x.toFixed(2)} ${point.y.toFixed(2)} ${((point.x+next.x)/2).toFixed(2)} ${((point.y+next.y)/2).toFixed(2)}`}return `${path} L${last.x.toFixed(2)} ${last.y.toFixed(2)}`}
export function strokesToSvg(input){const {width,height,strokes}=validateStrokes(input),paths=strokes.filter(s=>s.tool!=="eraser").map(stroke=>{const color=/^#[0-9a-f]{6}$/i.test(stroke.color)?stroke.color:"#111827",opacity=stroke.tool==="highlighter"?.35:1,a=stroke.points[0],b=stroke.points.at(-1),rx=Math.abs(b.x-a.x)/2,ry=Math.abs(b.y-a.y)/2,angle=Math.atan2(b.y-a.y,b.x-a.x),head=Math.max(10,(Number(stroke.width)||2)*3.2),line=stroke.tool==="rectangle"?`M${a.x} ${a.y}H${b.x}V${b.y}H${a.x}Z`:stroke.tool==="ellipse"?`M${(a.x+b.x)/2-rx} ${(a.y+b.y)/2}a${rx} ${ry} 0 1 0 ${rx*2} 0a${rx} ${ry} 0 1 0 ${-rx*2} 0`:stroke.tool==="arrow"?`M${a.x} ${a.y}L${b.x} ${b.y}M${b.x} ${b.y}L${b.x-head*Math.cos(angle-.4)} ${b.y-head*Math.sin(angle-.4)}M${b.x} ${b.y}L${b.x-head*Math.cos(angle+.4)} ${b.y-head*Math.sin(angle+.4)}`:smoothStrokePath(stroke.points),strokeWidth=Math.min(100,Math.max(.25,Number(stroke.width)||2));return `<path d="${line}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`}).join("");return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${paths}</svg>`}
const inkMarker=id=>`<!-- noema:ink:${id} -->\n![[Attachments/Noema Ink/${id}.svg]]\n<!-- /noema:ink:${id} -->`;
function ensureNoteBlocks(noteId,db){if(db.prepare("SELECT 1 FROM note_blocks WHERE note_id=? LIMIT 1").get(noteId))return;const note=db.prepare("SELECT content FROM notes WHERE id=?").get(noteId),time=now();db.prepare("INSERT INTO note_blocks(id,note_id,position,kind,markdown,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(randomUUID(),noteId,0,"markdown",note?.content||"",time,time)}

// Whole-note updates (optimization, restore, sync) must also update the shared editor.
export function syncNoteBlocks(noteId,content,db){
  const blocks=db.prepare("SELECT * FROM note_blocks WHERE note_id=? ORDER BY position").all(noteId);
  if(!blocks.length||projection(noteId,db)===content)return;
  const inks=new Map(blocks.filter(block=>block.kind==="ink").map(block=>[block.id,block]));
  const parts=[],seen=new Set();let offset=0;
  for(const match of content.matchAll(/<!-- noema:ink:([^\s]+) -->[\s\S]*?<!-- \/noema:ink:\1 -->/g)){
    if(!inks.has(match[1])||seen.has(match[1]))throw fail("Invalid handwriting reference in updated note",409);
    parts.push({markdown:content.slice(offset,match.index).trim()},{ink:match[1]});
    seen.add(match[1]);offset=match.index+match[0].length;
  }
  if(seen.size!==inks.size)throw fail("Updated note must preserve its handwriting references",409);
  parts.push({markdown:content.slice(offset).trim()});
  const markdownBlocks=blocks.filter(block=>block.kind==="markdown"),time=now();let index=0,position=0;
  for(const part of parts){
    if(part.ink){db.prepare("UPDATE note_blocks SET position=? WHERE id=?").run(position++,part.ink);continue}
    if(!part.markdown&&parts.length>1)continue;
    const block=markdownBlocks[index++];
    if(block)db.prepare("UPDATE note_blocks SET markdown=?,position=?,version=version+1,updated_at=? WHERE id=?").run(part.markdown,position++,time,block.id);
    else db.prepare("INSERT INTO note_blocks(id,note_id,position,kind,markdown,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(randomUUID(),noteId,position++,"markdown",part.markdown,time,time);
  }
  for(const block of markdownBlocks.slice(index))db.prepare("DELETE FROM note_blocks WHERE id=?").run(block.id);
}

function assertEditableNote(noteId,actor,db){
  const note=db.prepare("SELECT n.id,e.sync_state FROM notes n LEFT JOIN vault_entries e ON e.note_id=n.id AND e.deleted_at IS NULL WHERE n.id=? AND n.workspace_id=?").get(noteId,actor.workspaceId);
  if(!note)throw fail("Note not found",404);
  if(note.sync_state==="conflict")throw fail("Resolve the vault conflict before editing blocks",409);
}

export function insertMarkdownBlockAfter(noteId,afterBlockId,markdown,actor,db=getDatabase()){assertEditableNote(noteId,actor,db);
  const note=db.prepare("SELECT id FROM notes WHERE id=? AND workspace_id=?").get(noteId,actor.workspaceId);
  if(!note)throw fail("Note not found",404);
  const anchor=db.prepare("SELECT position FROM note_blocks WHERE id=? AND note_id=?").get(afterBlockId,noteId);
  if(!anchor)throw fail("Anchor block not found",404);
  ensureNoteBlocks(noteId,db);
  const time=now(),id=randomUUID();
  db.exec("BEGIN IMMEDIATE");
  try{
    db.prepare("UPDATE note_blocks SET position=position+1,updated_at=? WHERE note_id=? AND position>?").run(time,noteId,anchor.position);
    db.prepare("INSERT INTO note_blocks(id,note_id,position,kind,markdown,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(id,noteId,anchor.position+1,"markdown",String(markdown||"").slice(0,100000),time,time);
    db.exec("COMMIT");
  }catch(error){db.exec("ROLLBACK");throw error}
  writeBlockProjection(noteId,actor,db);
  return listNoteBlocks(noteId,actor,db).find(block=>block.id===id);
}
function projection(noteId,db){const local=!db.prepare("SELECT 1 FROM vault_entries WHERE note_id=? AND deleted_at IS NULL").get(noteId);return db.prepare("SELECT id,kind,markdown FROM note_blocks WHERE note_id=? ORDER BY position").all(noteId).map(block=>block.kind==="ink"?(local?`<!-- noema:ink:${block.id} -->\n![Handwriting](/api/v1/ink/${block.id}/svg)\n<!-- /noema:ink:${block.id} -->`:inkMarker(block.id)):block.markdown).filter(Boolean).join("\n\n")}
function writeBlockProjection(noteId,actor,db){const note=db.prepare("SELECT * FROM notes WHERE id=? AND workspace_id=?").get(noteId,actor.workspaceId),entry=db.prepare("SELECT e.*,s.root_path FROM vault_entries e JOIN vault_sources s ON s.id=e.source_id WHERE e.note_id=? AND s.workspace_id=?").get(noteId,actor.workspaceId);if(!note)throw fail("Note not found",404);if(!entry){const content=projection(noteId,db);saveNote({...note,tags:JSON.parse(note.tags_json),content,excerpt:content.replace(/[#*_>!-]/g,"").trim().slice(0,140),title:content.match(/^#\s+(.+)$/m)?.[1]||note.title},db,actor);return content}if(entry.sync_state==="conflict")throw fail("Resolve the vault conflict before editing blocks",409);const content=projection(noteId,db);const h1Match=content.match(/^#\s+(.+)$/m);const newTitle=h1Match?h1Match[1].trim():note.title;let targetPath=vaultPath(entry.root_path,entry.relative_path,{mustExist:true});if(newTitle&&newTitle!==note.title){const parentDir=entry.relative_path.includes("/")?entry.relative_path.slice(0,entry.relative_path.lastIndexOf("/")+1):"";const cleanName=newTitle.replace(/[\/\\?%*:|"<>]/g,"-").replace(/\s+/g," ").trim()||"Untitled";const targetRelativePath=`${parentDir}${cleanName}.md`;if(entry.relative_path!==targetRelativePath){try{moveVaultEntry(entry.source_id,{from:entry.relative_path,to:targetRelativePath},actor,db);const updatedEntry=db.prepare("SELECT relative_path FROM vault_entries WHERE id=?").get(entry.id);if(updatedEntry)targetPath=vaultPath(entry.root_path,updatedEntry.relative_path,{mustExist:true})}catch(_){}}}atomicWrite(targetPath,content);const digest=hash(content),time=now();db.prepare("UPDATE notes SET title=?,content=?,excerpt=?,updated_at=?,version=version+1 WHERE id=?").run(newTitle,content,content.replace(/[#*_>!-]/g,"").trim().slice(0,140),time,noteId);const currentEntry=db.prepare("SELECT id FROM vault_entries WHERE note_id=?").get(noteId);if(currentEntry)db.prepare("UPDATE vault_entries SET vault_hash=?,noema_hash=?,last_common_content=?,sync_state='synced',updated_at=? WHERE id=?").run(digest,digest,content,time,currentEntry.id);return content}
function validateComposition(value){const input=value&&typeof value==="object"?value:{},background=["blank","ruled","grid"].includes(input.background)?input.background:"blank",objects=Array.isArray(input.objects)?input.objects:[];if(objects.length>200)throw fail("Too many composition objects");const number=(value,fallback,min,max)=>{value=Number(value);return Math.min(max,Math.max(min,Number.isFinite(value)?value:fallback))};return {formatVersion:Number(input.formatVersion)===2?2:1,...(input.layout==="paper"?{layout:"paper",paperWidth:number(input.paperWidth,794,320,10000),writingExtent:number(input.writingExtent,1123,240,10000)}:{}),background,objects:objects.map((object,index)=>{if(!object||object.type!=="text")throw fail("Invalid composition object");return {id:String(object.id||`text-${index}`).slice(0,100),type:"text",x:number(object.x,40,0,10000),y:number(object.y,40,0,10000),width:number(object.width,320,80,10000),height:number(object.height,120,44,10000),z:Math.round(number(object.z,index,-10000,10000)),markdown:String(object.markdown||"").slice(0,100000)}})}}
export function listNoteBlocks(noteId,actor,db=getDatabase()){const note=db.prepare("SELECT 1 FROM notes WHERE id=? AND workspace_id=?").get(noteId,actor.workspaceId);if(!note)throw fail("Note not found",404);ensureNoteBlocks(noteId,db);return db.prepare("SELECT b.id,b.position,b.kind,b.markdown,b.version,i.width,i.height,i.strokes_json AS strokesJson,i.composition_json AS compositionJson,i.transcript,i.equations_json AS equationsJson,i.ocr_status AS ocrStatus,i.svg_path AS svgPath,i.version AS inkVersion FROM note_blocks b LEFT JOIN note_ink_blocks i ON i.block_id=b.id WHERE b.note_id=? ORDER BY b.position").all(noteId).map(row=>({...row,strokes:row.strokesJson?JSON.parse(row.strokesJson):[],composition:row.kind==="ink"?validateComposition(row.compositionJson?JSON.parse(row.compositionJson):null):undefined,equations:row.equationsJson?JSON.parse(row.equationsJson):[],taskProposals:row.kind==="ink"?db.prepare("SELECT id,text,state FROM ink_task_proposals WHERE block_id=? ORDER BY created_at").all(row.id):[]}))}
export function saveMarkdownBlock(noteId,input,actor,db=getDatabase()){assertEditableNote(noteId,actor,db);const note=db.prepare("SELECT 1 FROM notes WHERE id=? AND workspace_id=?").get(noteId,actor.workspaceId);if(!note)throw fail("Note not found",404);ensureNoteBlocks(noteId,db);const id=input.id||randomUUID(),before=db.prepare("SELECT * FROM note_blocks WHERE id=? AND note_id=? AND kind='markdown'").get(id,noteId),markdown=String(input.markdown??"");if(Buffer.byteLength(markdown)>2_000_000)throw fail("Markdown block too large");if(before&&Number(input.version)!==before.version)throw fail(`Expected version ${before.version}`,409);const time=now(),position=before?.position??db.prepare("SELECT COALESCE(MAX(position),-1)+1 value FROM note_blocks WHERE note_id=?").get(noteId).value;if(before)db.prepare("UPDATE note_blocks SET markdown=?,updated_at=?,version=version+1 WHERE id=?").run(markdown,time,id);else db.prepare("INSERT INTO note_blocks(id,note_id,position,kind,markdown,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(id,noteId,position,"markdown",markdown,time,time);writeBlockProjection(noteId,actor,db);return listNoteBlocks(noteId,actor,db).find(block=>block.id===id)}
export function reorderNoteBlocks(noteId,input,actor,db=getDatabase()){assertEditableNote(noteId,actor,db);const ids=Array.isArray(input.ids)?input.ids.map(String):[],current=db.prepare("SELECT id FROM note_blocks WHERE note_id=? ORDER BY position").all(noteId).map(row=>row.id);if(ids.length!==current.length||new Set(ids).size!==ids.length||ids.some(id=>!current.includes(id)))throw fail("Block order must contain every note block once");db.exec("BEGIN IMMEDIATE");try{for(let i=0;i<ids.length;i++)db.prepare("UPDATE note_blocks SET position=?,updated_at=? WHERE id=? AND note_id=?").run(-i-1,now(),ids[i],noteId);for(let i=0;i<ids.length;i++)db.prepare("UPDATE note_blocks SET position=? WHERE id=? AND note_id=?").run(i,ids[i],noteId);db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}writeBlockProjection(noteId,actor,db);return listNoteBlocks(noteId,actor,db)}
export function saveInkBlock(noteId,input,actor,db=getDatabase()){assertEditableNote(noteId,actor,db);
  const note=db.prepare("SELECT * FROM notes WHERE id=? AND workspace_id=?").get(noteId,actor.workspaceId);if(!note)throw fail("Note not found",404);ensureNoteBlocks(noteId,db);const validated=validateStrokes(input),id=input.id||randomUUID(),before=db.prepare("SELECT i.*,b.position FROM note_ink_blocks i JOIN note_blocks b ON b.id=i.block_id WHERE i.block_id=? AND b.note_id=?").get(id,noteId),composition=validateComposition(input.composition??(before?.composition_json?JSON.parse(before.composition_json):null));if(before&&Number(input.version)!==before.version)throw fail(`Expected version ${before.version}`,409);const entry=db.prepare("SELECT e.*,s.root_path FROM vault_entries e JOIN vault_sources s ON s.id=e.source_id WHERE e.note_id=? AND s.workspace_id=?").get(noteId,actor.workspaceId);const svgRel=`Attachments/Noema Ink/${id}.svg`,jsonRel=`Attachments/Noema Ink/${id}.json`;if(entry){atomicWrite(vaultPath(entry.root_path,svgRel),strokesToSvg(input));atomicWrite(vaultPath(entry.root_path,jsonRel),JSON.stringify({formatVersion:2,coordinateSpace:"world",width:validated.width,height:validated.height,strokes:validated.strokes,composition}));}const time=now(),position=before?.position??db.prepare("SELECT COALESCE(MAX(position),-1)+1 AS value FROM note_blocks WHERE note_id=?").get(noteId).value;
  db.exec("BEGIN IMMEDIATE");try{if(!before)db.prepare("INSERT INTO note_blocks(id,note_id,position,kind,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id,noteId,position,"ink",time,time);else db.prepare("UPDATE note_blocks SET updated_at=?,version=version+1 WHERE id=?").run(time,id);db.prepare("INSERT INTO note_ink_blocks(block_id,width,height,strokes_json,composition_json,svg_path,json_path,stroke_hash,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(block_id) DO UPDATE SET width=excluded.width,height=excluded.height,strokes_json=excluded.strokes_json,composition_json=excluded.composition_json,svg_path=excluded.svg_path,json_path=excluded.json_path,stroke_hash=excluded.stroke_hash,ocr_status='pending',updated_at=excluded.updated_at,version=note_ink_blocks.version+1").run(id,validated.width,validated.height,validated.json,JSON.stringify(composition),svgRel,jsonRel,hash(validated.json),time);db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}writeBlockProjection(noteId,actor,db);const jobId=input.queueOcr===false?null:enqueueJob("handwriting-ocr",{blockId:id},db,actor.workspaceId,{dedupeKey:`handwriting-ocr:${id}`});return {...db.prepare("SELECT * FROM note_ink_blocks WHERE block_id=?").get(id),id,position,jobId}
}
export function deleteNoteBlock(noteId,blockId,input,actor,db=getDatabase()){assertEditableNote(noteId,actor,db);const row=db.prepare("SELECT b.*,i.svg_path,i.json_path,s.root_path FROM note_blocks b JOIN notes n ON n.id=b.note_id LEFT JOIN note_ink_blocks i ON i.block_id=b.id LEFT JOIN vault_entries e ON e.note_id=n.id LEFT JOIN vault_sources s ON s.id=e.source_id WHERE b.id=? AND b.note_id=? AND n.workspace_id=?").get(blockId,noteId,actor.workspaceId);if(!row)throw fail("Block not found",404);if(Number(input.version)!==row.version)throw fail(`Expected version ${row.version}`,409);if(db.prepare("SELECT COUNT(*) value FROM note_blocks WHERE note_id=?").get(noteId).value===1)throw fail("A note must keep one block",409);db.prepare("DELETE FROM note_blocks WHERE id=?").run(blockId);for(const path of [row.svg_path,row.json_path])if(path&&row.root_path){const target=vaultPath(row.root_path,path);if(existsSync(target))renameSync(target,`${target}.trash-${Date.now()}`)}reorderNoteBlocks(noteId,{ids:db.prepare("SELECT id FROM note_blocks WHERE note_id=? ORDER BY position").all(noteId).map(item=>item.id)},actor,db);return {ok:true}}
export function retryInkOcr(blockId,actor,db=getDatabase()){const row=db.prepare("SELECT i.block_id FROM note_ink_blocks i JOIN note_blocks b ON b.id=i.block_id JOIN notes n ON n.id=b.note_id WHERE i.block_id=? AND n.workspace_id=?").get(blockId,actor.workspaceId);if(!row)throw fail("Ink block not found",404);db.prepare("UPDATE note_ink_blocks SET ocr_status='pending',updated_at=? WHERE block_id=?").run(now(),blockId);return {jobId:enqueueJob("handwriting-ocr",{blockId},db,actor.workspaceId)}}
export function updateInkTranscript(blockId,input,actor,db=getDatabase()){const row=db.prepare("SELECT i.*,n.id AS note_id,n.title,n.content,n.tags_json FROM note_ink_blocks i JOIN note_blocks b ON b.id=i.block_id JOIN notes n ON n.id=b.note_id WHERE i.block_id=? AND n.workspace_id=?").get(blockId,actor.workspaceId);if(!row)throw fail("Ink block not found",404);if(Number(input.version)!==row.version)throw fail(`Expected version ${row.version}`,409);const transcript=String(input.transcript||"").slice(0,100000),equations=Array.isArray(input.equations)?input.equations.slice(0,100):[];db.prepare("UPDATE note_ink_blocks SET transcript=?,equations_json=?,ocr_status='corrected',updated_at=?,version=version+1 WHERE block_id=?").run(transcript,JSON.stringify(equations),now(),blockId);const indexed=[...db.prepare("SELECT i.transcript FROM note_ink_blocks i JOIN note_blocks b ON b.id=i.block_id WHERE b.note_id=?").all(row.note_id).map(item=>item.transcript),row.content].join("\n");db.prepare("DELETE FROM notes_fts WHERE id=?").run(row.note_id);db.prepare("INSERT INTO notes_fts(id,title,content,tags) VALUES(?,?,?,?)").run(row.note_id,row.title,indexed,JSON.parse(row.tags_json).join(" "));return db.prepare("SELECT * FROM note_ink_blocks WHERE block_id=?").get(blockId)}
function moveContext(sourceId,from,to,workspaceId,db){const source=sourceRow(sourceId,workspaceId,db),oldPath=safeRelativePath(from),newPath=safeRelativePath(to);if(extname(oldPath).toLowerCase()!==".md"||extname(newPath).toLowerCase()!==".md")throw fail("Vault note paths must end in .md");const entry=db.prepare("SELECT * FROM vault_entries WHERE source_id=? AND relative_path=? AND deleted_at IS NULL").get(sourceId,oldPath);if(!entry)throw fail("Vault entry not found",404);const sourcePath=vaultPath(source.root_path,oldPath,{mustExist:true}),targetPath=vaultPath(source.root_path,newPath);if(existsSync(targetPath))throw fail("Vault destination already exists",409);const oldNames=[oldPath.slice(0,-3),basename(oldPath,".md")],newNames=[newPath.slice(0,-3),basename(newPath,".md")],changes=[];for(const candidate of db.prepare("SELECT e.*,n.content,n.version,n.title,n.tags_json,n.source FROM vault_entries e JOIN notes n ON n.id=e.note_id WHERE e.source_id=? AND e.deleted_at IS NULL").all(sourceId)){let content=candidate.content;for(let i=0;i<oldNames.length;i++){const pattern=new RegExp(`\\[\\[${oldNames[i].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?=([#|]|\\]\\]))`,"g");content=content.replace(pattern,`[[${newNames[i]}`)}if(content!==candidate.content)changes.push({...candidate,nextContent:content})}return {source,entry,oldPath,newPath,sourcePath,targetPath,changes}}
export function previewVaultMove(sourceId,input,workspaceId,db=getDatabase()){const context=moveContext(sourceId,input.from,input.to,workspaceId,db);return {from:context.oldPath,to:context.newPath,backlinks:context.changes.map(change=>({relativePath:change.relative_path,noteId:change.note_id,replacements:(change.content.match(/\[\[/g)||[]).length}))}}
export function moveVaultEntry(sourceId,input,actor,db=getDatabase()){const context=moveContext(sourceId,input.from,input.to,actor.workspaceId,db),originals=context.changes.map(change=>({path:vaultPath(context.source.root_path,change.relative_path,{mustExist:true}),content:readFileSync(vaultPath(context.source.root_path,change.relative_path,{mustExist:true}),"utf8")}));mkdirSync(dirname(context.targetPath),{recursive:true});renameSync(context.sourcePath,context.targetPath);try{for(const change of context.changes)atomicWrite(change.id===context.entry.id?context.targetPath:vaultPath(context.source.root_path,change.relative_path),change.nextContent);db.exec("BEGIN IMMEDIATE");try{db.prepare("UPDATE vault_entries SET relative_path=?,parent_path=?,vault_hash=?,noema_hash=?,last_common_content=?,updated_at=? WHERE id=?").run(context.newPath,dirname(context.newPath)==="."?"":dirname(context.newPath),hash(readFileSync(context.targetPath,"utf8")),hash(readFileSync(context.targetPath,"utf8")),readFileSync(context.targetPath,"utf8"),now(),context.entry.id);db.prepare("UPDATE vault_sync_manifests SET relative_path=? WHERE source_id=? AND relative_path=?").run(context.newPath,sourceId,context.oldPath);db.prepare("UPDATE vault_task_links SET relative_path=? WHERE source_id=? AND relative_path=?").run(context.newPath,sourceId,context.oldPath);for(const change of context.changes){saveNote({id:change.note_id,title:change.title,content:change.nextContent,tags:JSON.parse(change.tags_json),source:change.id===context.entry.id?`Obsidian · ${context.newPath}`:change.source,version:change.version},db,actor);const digest=hash(change.nextContent);db.prepare("UPDATE vault_entries SET vault_hash=?,noema_hash=?,last_common_content=?,updated_at=? WHERE id=?").run(digest,digest,change.nextContent,now(),change.id)}if(!context.changes.some(change=>change.id===context.entry.id)){const moved=db.prepare("SELECT * FROM notes WHERE id=?").get(context.entry.note_id);saveNote({id:moved.id,title:title(moved.content,context.newPath),content:moved.content,tags:JSON.parse(moved.tags_json),source:`Obsidian · ${context.newPath}`,version:moved.version},db,actor)}db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}}catch(error){if(existsSync(context.targetPath))renameSync(context.targetPath,context.sourcePath);for(const original of originals)atomicWrite(original.path,original.content);throw error}return {from:context.oldPath,to:context.newPath,updatedBacklinks:context.changes.length}}
export function trashVaultEntry(sourceId,relativePath,actor,db=getDatabase(),inTransaction=false){const source=sourceRow(sourceId,actor.workspaceId,db),rel=safeRelativePath(relativePath),entry=db.prepare("SELECT * FROM vault_entries WHERE source_id=? AND relative_path=? AND deleted_at IS NULL").get(sourceId,rel);if(!entry)throw fail("Vault entry not found",404);const from=vaultPath(source.root_path,rel,{mustExist:true}),trashRel=`.trash/Noema/${new Date().toISOString().replace(/[:.]/g,"-")}/${rel}`,to=vaultPath(source.root_path,trashRel);mkdirSync(dirname(to),{recursive:true});renameSync(from,to);const time=now();if(!inTransaction)db.exec("BEGIN IMMEDIATE");try{db.prepare("UPDATE vault_entries SET sync_state='trashed',deleted_at=?,updated_at=? WHERE id=?").run(time,time,entry.id);db.prepare("UPDATE notes SET trashed=1,updated_at=?,version=version+1 WHERE id=? AND workspace_id=?").run(time,entry.note_id,actor.workspaceId);if(!inTransaction)db.exec("COMMIT")}catch(error){if(!inTransaction)db.exec("ROLLBACK");renameSync(to,from);throw error}return {relativePath:rel,trashPath:trashRel,recoverable:true}}
let lastAutomaticScan=0;
export function scanConnectedVaults(db=getDatabase(),date=new Date()){if(date.getTime()-lastAutomaticScan<3000)return false;lastAutomaticScan=date.getTime();for(const source of db.prepare("SELECT s.id,s.workspace_id,w.created_by FROM vault_sources s JOIN workspaces w ON w.id=s.workspace_id WHERE s.state IN ('connected','error')").all()){try{scanVault(source.id,{id:source.created_by,workspaceId:source.workspace_id},db)}catch(error){db.prepare("UPDATE vault_sources SET state='error',last_result_json=?,updated_at=? WHERE id=?").run(JSON.stringify({error:String(error.message||error)}),now(),source.id)}}return true}
