import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";

const providers=new Set(["gemini","openai","deepseek","glm","kimi","qwen","openrouter"]),profiles=new Set(["fast","balanced","quality"]);
const key=value=>{if(!value||value.length<32)throw new Error("NOEMA_ENCRYPTION_KEY is required to store API keys") ;return createHash("sha256").update(value).digest()};
const seal=(value,secret)=>{const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(secret),iv),body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString("base64url")};
const open=(value,secret)=>{const packed=Buffer.from(value,"base64url"),cipher=createDecipheriv("aes-256-gcm",key(secret),packed.subarray(0,12));cipher.setAuthTag(packed.subarray(12,28));return Buffer.concat([cipher.update(packed.subarray(28)),cipher.final()]).toString("utf8")};
const view=row=>({id:row.id,name:row.name,provider:row.provider,model:row.model,profile:row.profile,baseUrl:row.base_url||"",enabled:!!row.enabled,hasApiKey:!!row.api_key_enc});

export function listAIAgents(userId,db=getDatabase()){return db.prepare("SELECT * FROM ai_agents WHERE user_id=? ORDER BY profile,position,created_at").all(userId).map(view)}
export function saveAIAgent(userId,input,encryptionKey,db=getDatabase()){
  const name=String(input.name||"").trim().slice(0,80),provider=String(input.provider||"").toLowerCase(),model=String(input.model||"").trim().slice(0,120),profile=String(input.profile||"fast"),apiKey=String(input.apiKey||"").trim(),baseUrl=String(input.baseUrl||"").trim().slice(0,500);
  if(!name||!model||!providers.has(provider)||!profiles.has(profile))throw Object.assign(new Error("Name, supported provider, model, and profile are required"),{status:400});
  if(!apiKey)throw Object.assign(new Error("API key is required"),{status:400});
  if(baseUrl&&!/^https:\/\//i.test(baseUrl))throw Object.assign(new Error("Base URL must use HTTPS"),{status:400});
  const id=randomUUID(),time=new Date().toISOString(),position=db.prepare("SELECT COUNT(*) count FROM ai_agents WHERE user_id=? AND profile=?").get(userId,profile).count;
  db.prepare("INSERT INTO ai_agents(id,user_id,name,provider,model,profile,api_key_enc,base_url,position,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(id,userId,name,provider,model,profile,seal(apiKey,encryptionKey),baseUrl||null,position,time,time);
  return view(db.prepare("SELECT * FROM ai_agents WHERE id=?").get(id));
}
export function deleteAIAgent(userId,id,db=getDatabase()){const result=db.prepare("DELETE FROM ai_agents WHERE id=? AND user_id=?").run(id,userId);if(!result.changes)throw Object.assign(new Error("AI agent not found"),{status:404})}
export function runtimeAIAgents(config,db=config?.db||getDatabase(config)){return db.prepare("SELECT * FROM ai_agents WHERE enabled=1 ORDER BY profile,position,created_at").all().map(row=>({...view(row),apiKey:open(row.api_key_enc,config.appEncryptionKey)}))}
