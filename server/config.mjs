import {existsSync,mkdirSync} from "node:fs";
import {delimiter,isAbsolute,resolve} from "node:path";
import {homedir} from "node:os";

const root=process.cwd();
const absolute=value=>value.startsWith("~/")?resolve(homedir(),value.slice(2)):isAbsolute(value)?value:resolve(root,value);
const setting=(env,name)=>env[`NOEMA_${name}`]??env[`LIFEOS_${name}`];
let cachedConfig;
export function loadConfig(env=process.env){
  if(cachedConfig)return cachedConfig;
  const dataDir=absolute(setting(env,"DATA_DIR")||".data"),newDb=resolve(dataDir,"noema.sqlite"),legacyDb=resolve(dataDir,"lifeos.sqlite");
  const config={
    dataDir,dbPath:!existsSync(newDb)&&existsSync(legacyDb)?legacyDb:newDb,objectsDir:resolve(dataDir,"objects"),jobsDir:resolve(dataDir,"jobs"),backupsDir:resolve(dataDir,"backups"),pluginsDir:resolve(dataDir,"plugins"),
    ownerEmail:(setting(env,"OWNER_EMAIL")||"").trim().toLowerCase(),ownerPassword:setting(env,"OWNER_PASSWORD")||"",totpSecret:(setting(env,"TOTP_SECRET")||"").replace(/\s+/g,"").toUpperCase(),appEncryptionKey:setting(env,"ENCRYPTION_KEY")||"",
    codeDir:absolute(setting(env,"CODE_DIR")||"."),savedCodeDir:absolute(setting(env,"SAVED_CODE_DIR")||resolve(homedir(),"Documents/mycode/snippets")),repositoryRoots:(setting(env,"REPOSITORY_ROOTS")||setting(env,"CODE_DIR")||".").split(delimiter).filter(Boolean).map(absolute),pluginCatalogs:(setting(env,"PLUGIN_CATALOGS")||"").split(delimiter).filter(Boolean).map(absolute),compilerEnabled:setting(env,"COMPILER_ENABLED")==="true",codexEnabled:setting(env,"CODEX_ENABLED")==="true",
    geminiApiKey:env.GEMINI_API_KEY||env.GOOGLE_API_KEY||"",geminiModel:setting(env,"GEMINI_MODEL")||"gemini-2.5-flash",
    openaiApiKey:env.OPENAI_API_KEY||"",openaiFastModel:setting(env,"OPENAI_FAST_MODEL")||"chat-latest",openaiReasoningModel:setting(env,"OPENAI_REASONING_MODEL")||"gpt-5.6",openaiEmbeddingModel:setting(env,"OPENAI_EMBEDDING_MODEL")||"text-embedding-3-small",
    aiFastChain:setting(env,"AI_FAST_CHAIN")||"",aiBalancedChain:setting(env,"AI_BALANCED_CHAIN")||"",aiQualityChain:setting(env,"AI_QUALITY_CHAIN")||"",aiTimeoutMs:Number(setting(env,"AI_TIMEOUT_MS")||15000),captureMaxInputChars:Number(setting(env,"AI_CAPTURE_MAX_INPUT_CHARS")||24000),captureMaxOutputTokens:Number(setting(env,"AI_CAPTURE_MAX_OUTPUT_TOKENS")||2000),workerPollMs:Number(setting(env,"WORKER_POLL_MS")||1000),
    deepseekApiKey:env.DEEPSEEK_API_KEY||"",deepseekBaseUrl:setting(env,"DEEPSEEK_BASE_URL")||"https://api.deepseek.com",glmApiKey:env.GLM_API_KEY||"",glmBaseUrl:setting(env,"GLM_BASE_URL")||"https://open.bigmodel.cn/api/paas/v4",kimiApiKey:env.KIMI_API_KEY||"",kimiBaseUrl:setting(env,"KIMI_BASE_URL")||"https://api.moonshot.cn/v1",qwenApiKey:env.QWEN_API_KEY||"",qwenBaseUrl:setting(env,"QWEN_BASE_URL")||"https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    codexPath:setting(env,"CODEX_PATH")||"codex",sessionHours:Number(setting(env,"SESSION_HOURS")||24*30),compileTimeoutMs:Number(setting(env,"COMPILE_TIMEOUT_MS")||10000),maxOutputBytes:Number(setting(env,"MAX_OUTPUT_BYTES")||262144),
    compilerIsolate:setting(env,"COMPILER_ISOLATE")!=="false",compilerUseCgroups:setting(env,"COMPILER_CGROUPS")==="true",compilerMemoryLimitBytes:Number(setting(env,"COMPILER_MEMORY_LIMIT_BYTES")||268435456),compilerCpuQuotaPercent:Number(setting(env,"COMPILER_CPU_QUOTA_PERCENT")||50),
    backupKey:setting(env,"BACKUP_KEY")||"",backupRetention:Number(setting(env,"BACKUP_RETENTION")||14),minFreeBytes:Number(setting(env,"MIN_FREE_BYTES")||1073741824),
    vapidPublicKey:setting(env,"VAPID_PUBLIC_KEY")||"",vapidPrivateKey:setting(env,"VAPID_PRIVATE_KEY")||"",vapidSubject:setting(env,"VAPID_SUBJECT")||"mailto:admin@localhost",
    googleClientId:setting(env,"GOOGLE_CLIENT_ID")||"",googleClientSecret:setting(env,"GOOGLE_CLIENT_SECRET")||"",googleRedirectUri:setting(env,"GOOGLE_REDIRECT_URI")||"",googleLoginRedirectUri:setting(env,"GOOGLE_LOGIN_REDIRECT_URI")||"",
  };
  if(!Number.isFinite(config.sessionHours)||config.sessionHours<=0)throw new Error("NOEMA_SESSION_HOURS must be positive");
  if(config.totpSecret&&(config.totpSecret.length<32||!/^[A-Z2-7]+$/.test(config.totpSecret)))throw new Error("NOEMA_TOTP_SECRET must be at least 32 base32 characters");
  if(config.appEncryptionKey&&config.appEncryptionKey.length<32)throw new Error("NOEMA_ENCRYPTION_KEY must contain at least 32 characters");
  if(!Number.isInteger(config.backupRetention)||config.backupRetention<1)throw new Error("NOEMA_BACKUP_RETENTION must be a positive integer");
  if(!Number.isFinite(config.compilerMemoryLimitBytes)||config.compilerMemoryLimitBytes<1)throw new Error("NOEMA_COMPILER_MEMORY_LIMIT_BYTES must be positive");
  if(!Number.isFinite(config.compilerCpuQuotaPercent)||config.compilerCpuQuotaPercent<1||config.compilerCpuQuotaPercent>100)throw new Error("NOEMA_COMPILER_CPU_QUOTA_PERCENT must be 1-100");
  for(const [name,value] of [["NOEMA_AI_TIMEOUT_MS",config.aiTimeoutMs],["NOEMA_AI_CAPTURE_MAX_INPUT_CHARS",config.captureMaxInputChars],["NOEMA_AI_CAPTURE_MAX_OUTPUT_TOKENS",config.captureMaxOutputTokens],["NOEMA_WORKER_POLL_MS",config.workerPollMs]])if(!Number.isInteger(value)||value<1)throw new Error(`${name} must be a positive integer`);
  cachedConfig=config;
  return config;
}

export function ensureDataDirs(config=loadConfig()){
  for(const dir of [config.dataDir,config.objectsDir,config.jobsDir,config.backupsDir,config.pluginsDir,config.savedCodeDir])mkdirSync(dir,{recursive:true,mode:0o700});
  return config;
}
