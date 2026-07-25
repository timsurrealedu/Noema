import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {resolve} from "node:path";
import {spawn,spawnSync} from "node:child_process";
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

function hasCommand(name){try{return spawnSync("which",[name],{shell:false}).status===0}catch{return false}}

export function compilerCapabilities(){
  return {
    bubblewrap:hasCommand("bwrap"),
    git:hasCommand("git"),
    systemdRun:hasCommand("systemd-run"),
    cgexec:hasCommand("cgexec"),
  };
}

function isInsideGitRepo(dir){
  if(!compilerCapabilities().git)return false;
  return spawnSync("git",["-C",dir,"rev-parse","--git-dir"],{shell:false}).status===0;
}

export function prepareWorktree(repoDir){
  if(!repoDir)repoDir=tmpdir();
  repoDir=resolve(repoDir);
  if(!isInsideGitRepo(repoDir)){
    const dir=mkdtempSync(resolve(tmpdir(),"compile-"));
    return {dir,isWorktree:false,repoDir:null};
  }
  const dir=mkdtempSync(resolve(tmpdir(),"compile-wt-"));
  const add=spawnSync("git",["-C",repoDir,"worktree","add","--detach",dir,"HEAD"],{shell:false,encoding:"utf8"});
  if(add.status!==0){
    rmSync(dir,{recursive:true,force:true});
    throw new Error(`git worktree add failed: ${add.stderr||add.stdout||"unknown"}`);
  }
  return {dir,isWorktree:true,repoDir};
}

export function cleanupWorktree({dir,isWorktree,repoDir}){
  if(isWorktree&&repoDir){
    spawnSync("git",["-C",repoDir,"worktree","remove","--force",dir],{shell:false});
  }
  rmSync(dir,{recursive:true,force:true});
}

function buildCommand(argv,{cwd,isolated,useCgroups,memoryLimitBytes,cpuQuotaPercent}){
  let command=argv;
  if(isolated){
    const caps=compilerCapabilities();
    if(!caps.bubblewrap)throw new Error("Bubblewrap isolation requested but bwrap is not installed");
    command=["bwrap","--unshare-all","--die-with-parent","--ro-bind","/usr","/usr","--ro-bind-try","/lib","/lib","--ro-bind-try","/lib64","/lib64","--ro-bind","/bin","/bin","--proc","/proc","--dev","/dev","--tmpfs","/tmp","--bind",cwd,"/work","--chdir","/work","--",...command];
  }
  if(useCgroups){
    const caps=compilerCapabilities();
    if(caps.systemdRun){
      command=["systemd-run","--scope","--user","--collect","--quiet","-p",`MemoryMax=${memoryLimitBytes||268435456}`,"-p",`CPUQuota=${cpuQuotaPercent||50}%`,"--",...command];
    }else if(caps.cgexec){
      command=["cgexec","-g",`memory,cpu:lifeos/compiler`,...command];
    }else{
      throw new Error("Cgroups requested but neither systemd-run nor cgexec is available");
    }
  }
  return command;
}

function execute(argv,{cwd,timeoutMs,maxOutputBytes,isolated,useCgroups,memoryLimitBytes,cpuQuotaPercent}){
  const command=buildCommand(argv,{cwd,isolated,useCgroups,memoryLimitBytes,cpuQuotaPercent});
  return new Promise((resolvePromise,reject)=>{
    const child=spawn(command[0],command.slice(1),{cwd,env:{PATH:process.env.PATH||"/usr/bin:/bin",HOME:isolated?"/tmp":(process.env.HOME||"/tmp"),LANG:"C.UTF-8"},stdio:["ignore","pipe","pipe"]});let output="",truncated=false,settled=false;
    const collect=chunk=>{if(output.length<maxOutputBytes)output+=chunk.toString().slice(0,maxOutputBytes-output.length);else truncated=true};child.stdout.on("data",collect);child.stderr.on("data",collect);
    const timer=setTimeout(()=>{child.kill("SIGKILL");},timeoutMs);
    child.on("error",error=>{clearTimeout(timer);if(!settled){settled=true;reject(error)}});child.on("close",code=>{clearTimeout(timer);if(!settled){settled=true;resolvePromise({code,output,truncated})}});
  });
}

export function availableLanguages(){return Object.keys(languages)}

export async function runCode({language,code},{
  enabled=false,timeoutMs=10000,maxOutputBytes=262144,isolate=true,useCgroups=false,
  memoryLimitBytes=268435456,cpuQuotaPercent=50,repoDir,jobsDir=tmpdir()
}={}){
  if(!enabled)throw new Error("Compiler is disabled");
  const spec=languages[language];if(!spec)throw new Error("Unsupported language");
  if(typeof code!=="string"||!code.trim())throw new Error("Code is required");
  if(Buffer.byteLength(code)>262144)throw new Error("Code exceeds 256 KiB");

  const session=prepareWorktree(repoDir||jobsDir);
  const started=Date.now();
  try{
    writeFileSync(resolve(session.dir,spec.file),code,{mode:0o600});
    if(spec.compile){
      const compiled=await execute(spec.compile,{cwd:session.dir,timeoutMs,maxOutputBytes,isolated:isolate,useCgroups,memoryLimitBytes,cpuQuotaPercent});
      if(compiled.code!==0)return {...compiled,stage:"compile",durationMs:Date.now()-started};
    }
    const ran=await execute(spec.run,{cwd:session.dir,timeoutMs,maxOutputBytes,isolated:isolate,useCgroups,memoryLimitBytes,cpuQuotaPercent});
    return {...ran,stage:"run",durationMs:Date.now()-started};
  }finally{
    cleanupWorktree(session);
  }
}
