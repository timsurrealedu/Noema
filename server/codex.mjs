import {spawn} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";

export function codexArgs({cwd,schemaPath,sandbox="read-only",search=false}){return [...(search?["--search"]:[]),"exec","--json","--ephemeral","--ignore-user-config","--skip-git-repo-check","--output-schema",schemaPath,"--sandbox",sandbox,"--cd",cwd,"-"]}

export function runCodex({prompt,cwd,schema,config,onEvent=()=>{},signal,search=false}){
  if(!config.codexEnabled)throw new Error("Codex jobs are disabled");if(typeof prompt!=="string"||!prompt.trim())throw new Error("Prompt is required");mkdirSync(cwd,{recursive:true,mode:0o700});const schemaPath=resolve(cwd,"output.schema.json");writeFileSync(schemaPath,JSON.stringify(schema),{mode:0o600});
  const argv=codexArgs({cwd,schemaPath,sandbox:"read-only",search});return new Promise((resolvePromise,reject)=>{const child=spawn(config.codexPath,argv,{cwd,env:{PATH:process.env.PATH,HOME:process.env.HOME,CODEX_HOME:process.env.CODEX_HOME},stdio:["pipe","pipe","pipe"]});let buffer="",stderr="",last=null,finalText="";const abort=()=>child.kill("SIGTERM");signal?.addEventListener("abort",abort,{once:true});child.stdout.on("data",chunk=>{buffer+=chunk;const lines=buffer.split("\n");buffer=lines.pop()||"";for(const line of lines){if(!line.trim())continue;try{const event=JSON.parse(line);last=event;if(event.type==="item.completed"&&event.item?.type==="agent_message")finalText=event.item.text||"";onEvent(event)}catch{}}});child.stderr.on("data",chunk=>stderr=(stderr+chunk).slice(-8000));child.on("error",reject);child.on("close",code=>{signal?.removeEventListener("abort",abort);if(code===0){try{resolvePromise({code,last,result:JSON.parse(finalText)})}catch{reject(new Error("Codex returned invalid structured output"))}}else reject(new Error(stderr||`Codex exited with code ${code}`))});child.stdin.end(prompt)})
}
