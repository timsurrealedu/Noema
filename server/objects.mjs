import {createHash,randomUUID} from "node:crypto";
import {createWriteStream,existsSync,mkdirSync,renameSync,unlinkSync} from "node:fs";
import {dirname,join} from "node:path";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {getDatabase} from "./db.mjs";
import {loadConfig} from "./config.mjs";

const now=()=>new Date().toISOString();
const allowedMimes=new Map([
  ["application/pdf","Document"],["application/vnd.openxmlformats-officedocument.wordprocessingml.document","Document"],["text/plain","Text"],["text/markdown","Text"],["text/csv","Text"],
  ["image/png","Image"],["image/jpeg","Image"],["image/webp","Image"],["image/gif","Image"],
  ["audio/mpeg","Audio"],["audio/wav","Audio"],["audio/ogg","Audio"],["audio/webm","Audio"],["audio/mp4","Audio"],
]);
export const maxAssetBytes=50*1024*1024;

export function assetPath(sha256,config=loadConfig()){return join(config.objectsDir,sha256.slice(0,2),sha256)}

export async function storeAsset({stream,name,mime},config=loadConfig(),db=getDatabase(config),workspaceId=null){
  const kind=allowedMimes.get(mime);if(!kind)throw Object.assign(new Error(`Unsupported file type: ${mime||"unknown"}`),{status:415,code:"UNSUPPORTED_TYPE"});
  const label=String(name||"upload").slice(0,300),tempPath=join(config.jobsDir,`upload-${randomUUID()}`);
  const hash=createHash("sha256");let size=0;
  const source=stream instanceof Readable?stream:Readable.fromWeb(stream);
  source.on("data",chunk=>{size+=chunk.length;if(size>maxAssetBytes)source.destroy(Object.assign(new Error("File exceeds the 50 MB limit"),{status:413,code:"TOO_LARGE"}));else hash.update(chunk)});
  try{await pipeline(source,createWriteStream(tempPath,{mode:0o600}))}catch(error){unlinkSync(tempPath,()=>{});throw error.status?error:Object.assign(new Error("Upload failed"),{status:400})}
  if(!size){unlinkSync(tempPath,()=>{});throw Object.assign(new Error("Empty file"),{status:400,code:"EMPTY_FILE"})}
  const sha256=hash.digest("hex"),finalPath=assetPath(sha256,config);
  mkdirSync(dirname(finalPath),{recursive:true,mode:0o700});
  if(existsSync(finalPath))unlinkSync(tempPath,()=>{});else try{renameSync(tempPath,finalPath)}catch(error){unlinkSync(tempPath,()=>{});throw error}
  const existing=db.prepare("SELECT * FROM assets WHERE sha256=?").get(sha256);if(existing){if(workspaceId)db.prepare("INSERT OR IGNORE INTO workspace_assets(workspace_id,asset_id,created_at) VALUES(?,?,?)").run(workspaceId,existing.id,now());return {...existing,kind,deduplicated:true}}
  const id=randomUUID(),time=now();
  db.prepare("INSERT INTO assets(id,sha256,name,mime,size,created_at) VALUES(?,?,?,?,?,?)").run(id,sha256,label,mime,size,time);
  if(workspaceId)db.prepare("INSERT INTO workspace_assets(workspace_id,asset_id,created_at) VALUES(?,?,?)").run(workspaceId,id,time);
  return {id,sha256,name:label,mime,size,created_at:time,kind,deduplicated:false};
}

export function getAsset(id,db=getDatabase(),workspaceId=null){const asset=workspaceId?db.prepare("SELECT a.* FROM assets a JOIN workspace_assets wa ON wa.asset_id=a.id WHERE wa.workspace_id=? AND (a.id=? OR a.sha256=?)").get(workspaceId,id,id):db.prepare("SELECT * FROM assets WHERE id=? OR sha256=?").get(id,id);return asset||null}
export function assetsForCapture(captureId,db=getDatabase(),workspaceId=null){return db.prepare(`SELECT a.* FROM capture_assets ca JOIN assets a ON a.id=ca.asset_id JOIN captures c ON c.id=ca.capture_id WHERE ca.capture_id=?${workspaceId?" AND c.workspace_id=?":""}`).all(captureId,...(workspaceId?[workspaceId]:[]))}
export function attachAssets(captureId,assetIds,db=getDatabase(),workspaceId=null){
  if(!Array.isArray(assetIds))return;
  for(const assetId of assetIds.slice(0,10)){
    const asset=getAsset(String(assetId),db,workspaceId);if(!asset)throw Object.assign(new Error(`Asset not found: ${assetId}`),{status:404});
    db.prepare("INSERT OR IGNORE INTO capture_assets(capture_id,asset_id) VALUES(?,?)").run(captureId,asset.id);
  }
}
