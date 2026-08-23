import {execFile} from "node:child_process";
import {mkdtempSync,readdirSync,rmSync,statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {promisify} from "node:util";
import {randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {assetPath} from "./objects.mjs";
import {enqueueJob} from "./jobs.mjs";
import {loadConfig} from "./config.mjs";

const execFileAsync=promisify(execFile);
const now=()=>new Date().toISOString();
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const audioChunkSeconds=Number(process.env.NOEMA_AUDIO_CHUNK_SECONDS||600);
export const whisperBin=process.env.WHISPER_BIN||"";

function mimeForExtension(name){return name.endsWith(".ogg")?"audio/ogg":name.endsWith(".mp3")?"audio/mpeg":name.endsWith(".m4a")?"audio/mp4":"audio/webm"}

/** Segment a long recording with ffmpeg so no chunk exceeds provider upload caps. */
export async function chunkAudio(path,seconds=audioChunkSeconds){
  const dir=join(mkdtempSync(join(tmpdir(),"noema-audio-")),"segments");
  await execFileAsync("ffmpeg",["-hide_banner","-loglevel","error","-i",path,"-f","segment","-segment_time",String(seconds),"-c","copy",join(dir,"chunk-%03d.webm")],{timeout:300000,maxBuffer:4*1024*1024});
  return readdirSync(dir).sort().map(name=>({path:join(dir,name),mime:mimeForExtension(name)}));
}

async function transcribeViaGroq(path,mime,config){
  if(!config.groqApiKey)throw new Error("Groq is not configured");
  const {readFile}=await import("node:fs/promises");
  const form=new FormData();
  form.append("file",new Blob([await readFile(path)],{type:mime}),"audio");
  form.append("model",config.groqWhisperModel||"whisper-large-v3");
  form.append("response_format","verbose_json");
  const base=(config.groqBaseUrl||"https://api.groq.com/openai/v1").replace(/\/$/,"");
  const response=await fetch(`${base}/audio/transcriptions`,{method:"POST",headers:{Authorization:`Bearer ${config.groqApiKey}`},body:form,signal:AbortSignal.timeout(300000)});
  if(!response.ok)throw new Error(`Groq Whisper failed (HTTP ${response.status})`);
  const data=await response.json();
  const segments=(data.segments||[]).map(segment=>({start:Number(segment.start)||0,end:Number(segment.end)||0,text:String(segment.text||"").trim()})).filter(segment=>segment.text);
  return {text:String(data.text||segments.map(segment=>segment.text).join(" ")).trim(),segments,provider:"groq",model:data.model||config.groqWhisperModel||"whisper-large-v3"};
}

async function transcribeViaGemini(path,mime,config){
  const {runGeminiMultimodal}=await import("./ai.mjs");
  const {readFile}=await import("node:fs/promises");
  const stat=statSync(path);
  if(stat.size>24*1024*1024)throw new Error("Chunk exceeds the Gemini inline limit");
  const schema={type:"object",properties:{text:{type:"string"}},required:["text"]};
  const {result}=await runGeminiMultimodal({prompt:"Transcribe the spoken content verbatim. Preserve the original language.",base64:await readFile(path,"base64"),mimeType:mime,schema,config});
  return {text:String(result.text||"").trim(),segments:[],provider:"gemini",model:config.geminiModel};
}

async function transcribeLocally(path){
  if(!whisperBin)throw new Error("Local whisper.cpp is not configured");
  await execFileAsync(whisperBin,["-m",process.env.WHISPER_MODEL||"",path,"-otxt","-of",path],{timeout:600000});
  const {readFile}=await import("node:fs/promises");
  return {text:(await readFile(`${path}.txt`,"utf8")).trim(),segments:[],provider:"whisper.cpp",model:process.env.WHISPER_MODEL||"local"};
}

async function transcribeChunk(path,mime,config){
  for(const attempt of [()=>transcribeViaGemini(path,mime,config),()=>transcribeViaGroq(path,mime,config),()=>transcribeLocally(path)]){
    try{const result=await attempt();if(result.text)return result}catch(error){/* fall through to the next provider */}}
  throw new Error("No transcription provider succeeded");
}

const stamp=seconds=>`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(Math.floor(seconds%60)).padStart(2,"0")}`;

export async function transcribeAudioFile(assetPath,mime,config=loadConfig()){
  let chunks=[{path:assetPath,mime}],tempDirs=[];
  try{
    if(statSync(assetPath).size>10*1024*1024){chunks=await chunkAudio(assetPath);tempDirs.push(chunks[0].path)}
    let offset=0;const segments=[];let text="",provider="",model="";
    for(const chunk of chunks){
      const result=await transcribeChunk(chunk.path,chunk.mime,config);
      provider=result.provider;model=result.model;
      const shifted=result.segments.map(segment=>({start:segment.start+offset,end:segment.end+offset,text:segment.text}));
      if(shifted.length)segments.push(...shifted);
      else if(result.text){const durationGuess=Math.max(1,(chunks.length>0?audioChunkSeconds:1));segments.push({start:offset,end:offset+durationGuess,text:result.text})}
      text+=(text?" ":"")+result.text;
      offset+=Math.max(1,Math.round(statSync(chunk.path).size/16000)); // ~16 kB/s webm estimate when ffprobe data is unavailable
    }
    return {text:text.slice(0,500000),segments:segments.slice(0,5000).map(segment=>({...segment,label:stamp(segment.start)})),provider,model};
  }finally{for(const dir of tempDirs){try{rmSync(dir,{recursive:true,force:true})}catch{/* ignore */}}}
}

export function requestTranscription(captureId,actor,db=getDatabase()){
  const capture=db.prepare("SELECT id FROM captures WHERE id=? AND workspace_id=?").get(String(captureId),actor.workspaceId);
  if(!capture)throw fail("Capture not found",404);
  const assets=db.prepare("SELECT a.id,a.mime FROM capture_assets ca JOIN assets a ON a.id=ca.asset_id WHERE ca.capture_id=? AND a.mime LIKE 'audio/%'").all(captureId);
  if(!assets.length)throw fail("Capture has no audio asset",400);
  const existing=db.prepare("SELECT id,state FROM audio_transcripts WHERE capture_id=?").get(captureId);
  if(existing&&["queued","running"].includes(existing.state))return {state:existing.state};
  const key=`transcribe-audio:${captureId}`,active=db.prepare("SELECT 1 FROM jobs WHERE dedupe_key=? AND state IN ('queued','claimed','running')").get(key);
  if(active)return {state:"queued"};
  const jobId=enqueueJob("transcribe-audio",{captureId},db,actor.workspaceId,{dedupeKey:key,maxAttempts:2});
  const time=now(),id=randomUUID();
  db.prepare("INSERT INTO audio_transcripts(id,capture_id,asset_id,state,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(capture_id) DO UPDATE SET state='queued',updated_at=excluded.updated_at").run(id,captureId,assets[0].id,"queued",time,time);
  return {jobId,state:"queued"};
}

export function transcriptForCapture(captureId,workspaceId,db=getDatabase()){
  const row=db.prepare("SELECT t.* FROM audio_transcripts t JOIN captures c ON c.id=t.capture_id WHERE t.capture_id=? AND c.workspace_id=? ORDER BY t.created_at DESC LIMIT 1").get(String(captureId),workspaceId);
  if(!row)return null;
  return {...row,segments:JSON.parse(row.segments_json||"[]"),segments_json:undefined};
}

export function finishTranscription(captureId,result,db=getDatabase()){
  const time=now(),existing=db.prepare("SELECT id FROM audio_transcripts WHERE capture_id=?").get(captureId);
  const row={id:existing?.id||randomUUID()};
  db.prepare(`INSERT INTO audio_transcripts(id,capture_id,asset_id,content,segments_json,state,provider,model,duration_seconds,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(capture_id) DO UPDATE SET content=excluded.content,segments_json=excluded.segments_json,state='complete',provider=excluded.provider,model=excluded.model,duration_seconds=excluded.duration_seconds,updated_at=excluded.updated_at`)
    .run(row.id,captureId,result.assetId||null,result.text,JSON.stringify(result.segments||[]),"complete",result.provider,result.model,result.durationSeconds??null,time,time);
}
