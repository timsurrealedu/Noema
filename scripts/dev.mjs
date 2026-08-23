import {spawn} from "node:child_process";

const processes=[
  ["web",spawn("npm",["run","dev:web"],{stdio:"inherit"})],
  ["worker",spawn(process.execPath,["--env-file-if-exists=.env.local","server/worker.mjs"],{stdio:"inherit"})],
];
let stopping=false;

function stop(signal="SIGTERM"){if(stopping)return;stopping=true;for(const [,child] of processes)if(child.exitCode==null)child.kill(signal)}
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>stop(signal));
for(const [name,child] of processes)child.on("exit",(code,signal)=>{if(stopping)return;console.error(`[dev] ${name} exited (${signal||code}); stopping development services.`);process.exitCode=code||1;stop()});
