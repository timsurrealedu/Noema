import {mkdirSync} from "node:fs";
import {isAbsolute,resolve} from "node:path";

const root=process.cwd();
const absolute=value=>isAbsolute(value)?value:resolve(root,value);

export function loadConfig(env=process.env){
  const dataDir=absolute(env.LIFEOS_DATA_DIR||".data");
  const config={
    dataDir,dbPath:resolve(dataDir,"lifeos.sqlite"),objectsDir:resolve(dataDir,"objects"),jobsDir:resolve(dataDir,"jobs"),
    ownerEmail:(env.LIFEOS_OWNER_EMAIL||"").trim().toLowerCase(),ownerPassword:env.LIFEOS_OWNER_PASSWORD||"",
    codeDir:absolute(env.LIFEOS_CODE_DIR||"."),compilerEnabled:env.LIFEOS_COMPILER_ENABLED==="true",codexEnabled:env.LIFEOS_CODEX_ENABLED==="true",
    geminiApiKey:env.GEMINI_API_KEY||env.GOOGLE_API_KEY||"",geminiModel:env.LIFEOS_GEMINI_MODEL||"gemini-2.5-flash",
    codexPath:env.LIFEOS_CODEX_PATH||"codex",sessionHours:Number(env.LIFEOS_SESSION_HOURS||24*30),compileTimeoutMs:Number(env.LIFEOS_COMPILE_TIMEOUT_MS||10000),maxOutputBytes:Number(env.LIFEOS_MAX_OUTPUT_BYTES||262144),
  };
  if(!Number.isFinite(config.sessionHours)||config.sessionHours<=0)throw new Error("LIFEOS_SESSION_HOURS must be positive");
  return config;
}

export function ensureDataDirs(config=loadConfig()){
  for(const dir of [config.dataDir,config.objectsDir,config.jobsDir])mkdirSync(dir,{recursive:true,mode:0o700});
  return config;
}
