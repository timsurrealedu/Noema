import {createHash,randomUUID} from "node:crypto";
import {chmodSync,mkdirSync,readFileSync,readdirSync,realpathSync,statSync,writeFileSync} from "node:fs";
import {extname,join,relative} from "node:path";
import {getDatabase} from "./db.mjs";
import {loadConfig} from "./config.mjs";

const hash=path=>createHash("sha256").update(readFileSync(path)).digest("hex");
function manifestFiles(root,dir=root){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isSymbolicLink()||[".git",".obsidian",".trash"].includes(entry.name)?[]:entry.isDirectory()?manifestFiles(root,join(dir,entry.name)):entry.isFile()&&extname(entry.name).toLowerCase()===".md"?[{relativePath:relative(root,join(dir,entry.name)).replaceAll("\\","/"),sha256:hash(join(dir,entry.name)),size:statSync(join(dir,entry.name)).size}]:[])}
export function prepareVaultActivation(rootPath,config=loadConfig(),db=getDatabase(config)){const root=realpathSync(rootPath);if(!statSync(root).isDirectory())throw new Error("Obsidian vault must be a directory");mkdirSync(config.backupsDir,{recursive:true,mode:0o700});const stamp=new Date().toISOString().replace(/[:.]/g,"-"),suffix=randomUUID().slice(0,8),databasePath=join(config.backupsDir,`pre-vault-${stamp}-${suffix}.sqlite`),manifestPath=join(config.backupsDir,`pre-vault-${stamp}-${suffix}.manifest.json`);db.prepare("VACUUM INTO ?").run(databasePath);writeFileSync(manifestPath,JSON.stringify({version:1,createdAt:new Date().toISOString(),root,files:manifestFiles(root)},null,2),{encoding:"utf8",mode:0o400,flag:"wx"});chmodSync(databasePath,0o400);return {databasePath,manifestPath}}
