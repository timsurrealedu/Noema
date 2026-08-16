import {createHash} from "node:crypto";
import {readdirSync,readFileSync,realpathSync,statSync} from "node:fs";
import {basename,extname,join,relative} from "node:path";
import {getDatabase} from "../server/db.mjs";
import {saveNote} from "../server/core.mjs";

const root=realpathSync(process.argv[2]||"");
if(!statSync(root).isDirectory())throw new Error("Obsidian vault must be a directory");
const skipped=new Set([".obsidian",".git",".claude",".inbox-archive"]);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isSymbolicLink()||skipped.has(entry.name)?[]:entry.isDirectory()?files(join(dir,entry.name)):entry.isFile()&&extname(entry.name).toLowerCase()===".md"?[join(dir,entry.name)]:[])}
function id(path){const hex=createHash("sha256").update(`obsidian:${path}`).digest("hex").slice(0,32).split("");hex[12]="4";hex[16]=((parseInt(hex[16],16)&3)|8).toString(16);return `${hex.slice(0,8).join("")}-${hex.slice(8,12).join("")}-${hex.slice(12,16).join("")}-${hex.slice(16,20).join("")}-${hex.slice(20).join("")}`}
function metadata(content,path){const frontmatter=content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]||"",frontTitle=frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/mi)?.[1],heading=content.match(/^#\s+(.+)$/m)?.[1],tagLine=frontmatter.match(/^tags:\s*(.+)$/mi)?.[1],tags=tagLine?tagLine.replace(/^\[|\]$/g,"").split(",").map(value=>value.trim().replace(/^['"]|['"]$/g,"")).filter(Boolean):[];return {title:frontTitle||heading||basename(path,".md"),tags}}

const db=getDatabase(),user=db.prepare("SELECT id FROM users ORDER BY created_at LIMIT 1").get(),workspace=user&&db.prepare("SELECT workspace_id AS id FROM workspace_members WHERE user_id=? LIMIT 1").get(user.id);
if(!user||!workspace)throw new Error("Create a Noema user and workspace before syncing");
let created=0,updated=0,unchanged=0;
try{for(const path of files(root)){const sourcePath=relative(root,path).replaceAll("\\","/"),content=readFileSync(path,"utf8");if(Buffer.byteLength(content)>2_000_000)continue;const noteId=id(sourcePath),before=db.prepare("SELECT * FROM notes WHERE id=? AND workspace_id=?").get(noteId,workspace.id),{title,tags}=metadata(content,path),source=`Obsidian · ${sourcePath}`;if(before&&before.title===title&&before.content===content&&before.tags_json===JSON.stringify(tags)){unchanged++;continue}saveNote({id:noteId,title,content,tags,source,version:before?.version},db,{id:user.id,workspaceId:workspace.id});before?updated++:created++}}
finally{db.close()}
console.log(`Obsidian sync: ${created} created, ${updated} updated, ${unchanged} unchanged`);
