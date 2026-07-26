import {mkdirSync} from "node:fs";
import {isAbsolute,resolve} from "node:path";

const root=process.cwd();
const absolute=value=>isAbsolute(value)?value:resolve(root,value);

export function loadConfig(env=process.env){
  const dataDir=absolute(env.LIFEOS_DATA_DIR||".data");
  const config={
    dataDir,dbPath:resolve(dataDir,"lifeos.sqlite"),objectsDir:resolve(dataDir,"objects"),jobsDir:resolve(dataDir,"jobs"),backupsDir:resolve(dataDir,"backups"),
    ownerEmail:(env.LIFEOS_OWNER_EMAIL||"").trim().toLowerCase(),ownerPassword:env.LIFEOS_OWNER_PASSWORD||"",totpSecret:(env.LIFEOS_TOTP_SECRET||"").replace(/\s+/g,"").toUpperCase(),
    codeDir:absolute(env.LIFEOS_CODE_DIR||"."),compilerEnabled:env.LIFEOS_COMPILER_ENABLED==="true",codexEnabled:env.LIFEOS_CODEX_ENABLED==="true",
    geminiApiKey:env.GEMINI_API_KEY||env.GOOGLE_API_KEY||"",geminiModel:env.LIFEOS_GEMINI_MODEL||"gemini-2.5-flash",
    openaiApiKey:env.OPENAI_API_KEY||"",openaiFastModel:env.LIFEOS_OPENAI_FAST_MODEL||"chat-latest",openaiReasoningModel:env.LIFEOS_OPENAI_REASONING_MODEL||"gpt-5.6",
    codexPath:env.LIFEOS_CODEX_PATH||"codex",sessionHours:Number(env.LIFEOS_SESSION_HOURS||24*30),compileTimeoutMs:Number(env.LIFEOS_COMPILE_TIMEOUT_MS||10000),maxOutputBytes:Number(env.LIFEOS_MAX_OUTPUT_BYTES||262144),
    compilerIsolate:env.LIFEOS_COMPILER_ISOLATE!=="false",compilerUseCgroups:env.LIFEOS_COMPILER_CGROUPS==="true",compilerMemoryLimitBytes:Number(env.LIFEOS_COMPILER_MEMORY_LIMIT_BYTES||268435456),compilerCpuQuotaPercent:Number(env.LIFEOS_COMPILER_CPU_QUOTA_PERCENT||50),
    backupKey:env.LIFEOS_BACKUP_KEY||"",backupRetention:Number(env.LIFEOS_BACKUP_RETENTION||14),minFreeBytes:Number(env.LIFEOS_MIN_FREE_BYTES||1073741824),
  };
  if(!Number.isFinite(config.sessionHours)||config.sessionHours<=0)throw new Error("LIFEOS_SESSION_HOURS must be positive");
  if(config.totpSecret&&(config.totpSecret.length<32||!/^[A-Z2-7]+$/.test(config.totpSecret)))throw new Error("LIFEOS_TOTP_SECRET must be at least 32 base32 characters");
  if(!Number.isInteger(config.backupRetention)||config.backupRetention<1)throw new Error("LIFEOS_BACKUP_RETENTION must be a positive integer");
  if(!Number.isFinite(config.compilerMemoryLimitBytes)||config.compilerMemoryLimitBytes<1)throw new Error("LIFEOS_COMPILER_MEMORY_LIMIT_BYTES must be positive");
  if(!Number.isFinite(config.compilerCpuQuotaPercent)||config.compilerCpuQuotaPercent<1||config.compilerCpuQuotaPercent>100)throw new Error("LIFEOS_COMPILER_CPU_QUOTA_PERCENT must be 1-100");
  return config;
}

export function ensureDataDirs(config=loadConfig()){
  for(const dir of [config.dataDir,config.objectsDir,config.jobsDir,config.backupsDir])mkdirSync(dir,{recursive:true,mode:0o700});
  return config;
}
