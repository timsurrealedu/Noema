import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {resolve} from "node:path";
import {spawn} from "node:child_process";
import {tmpdir} from "node:os";

const languages={
  javascript:{file:"main.js",compile:null,run:["node","main.js"]},
  python:{file:"main.py",compile:null,run:["python3","-I","main.py"]},
  c:{file:"main.c",compile:["gcc","main.c","-O0","-o","program"],run:["./program"]},
  cpp:{file:"main.cpp",compile:["g++","main.cpp","-O0","-o","program"],run:["./program"]},
  go:{file:"main.go",compile:["go","build","-o","program","main.go"],run:["./program"]},
  rust:{file:"main.rs",compile:["rustc","main.rs","-o","program"],run:["./program"]},
  java:{file:"Main.java",compile:["javac","Main.java"],run:["java","Main"]},
};

function execute(argv,{cwd,timeoutMs,maxOutputBytes,isolated}){
  const command=isolated?["bwrap","--unshare-all","--die-with-parent","--ro-bind","/usr","/usr","--ro-bind","/lib","/lib","--ro-bind-try","/lib64","/lib64","--ro-bind","/bin","/bin","--proc","/proc","--dev","/dev","--tmpfs","/tmp","--bind",cwd,"/work","--chdir","/work","--",...argv]:argv;
  return new Promise((resolvePromise,reject)=>{
    const child=spawn(command[0],command.slice(1),{cwd,env:{PATH:process.env.PATH||"/usr/bin:/bin",HOME:"/tmp",LANG:"C.UTF-8"},stdio:["ignore","pipe","pipe"]});let output="",truncated=false,settled=false;
    const collect=chunk=>{if(output.length<maxOutputBytes)output+=chunk.toString().slice(0,maxOutputBytes-output.length);else truncated=true};child.stdout.on("data",collect);child.stderr.on("data",collect);
    const timer=setTimeout(()=>{child.kill("SIGKILL");},timeoutMs);
    child.on("error",error=>{clearTimeout(timer);if(!settled){settled=true;reject(error)}});child.on("close",code=>{clearTimeout(timer);if(!settled){settled=true;resolvePromise({code,output,truncated})}});
  });
}

export function availableLanguages(){return Object.keys(languages)}

export async function runCode({language,code},{enabled=false,timeoutMs=10000,maxOutputBytes=262144,isolate=true,jobsDir=tmpdir()}={}){
  if(!enabled)throw new Error("Compiler is disabled");const spec=languages[language];if(!spec)throw new Error("Unsupported language");if(typeof code!=="string"||!code.trim())throw new Error("Code is required");if(Buffer.byteLength(code)>262144)throw new Error("Code exceeds 256 KiB");
  const cwd=mkdtempSync(resolve(jobsDir,"compile-"));const started=Date.now();try{writeFileSync(resolve(cwd,spec.file),code,{mode:0o600});if(spec.compile){const compiled=await execute(spec.compile,{cwd,timeoutMs,maxOutputBytes,isolated:isolate});if(compiled.code!==0)return {...compiled,stage:"compile",durationMs:Date.now()-started}}const ran=await execute(spec.run,{cwd,timeoutMs,maxOutputBytes,isolated:isolate});return {...ran,stage:"run",durationMs:Date.now()-started}}finally{rmSync(cwd,{recursive:true,force:true})}
}
