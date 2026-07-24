"use client";

import Link from "next/link";
import {FormEvent, useState} from "react";
import {ArrowLeft, CheckCircle, Play, Sparkle, Terminal, WarningCircle} from "@phosphor-icons/react";
import {ModuleShell} from "../../components/ModuleShell";
import {TutorPanel} from "../../components/TutorPanel";

const starters={javascript:"console.log(6 * 7);",python:"print(6 * 7)",c:'#include <stdio.h>\nint main(void) { printf("%d\\n", 6 * 7); }',cpp:'#include <iostream>\nint main() { std::cout << 6 * 7 << "\\n"; }',go:'package main\nimport "fmt"\nfunc main() { fmt.Println(6 * 7) }',rust:'fn main() { println!("{}", 6 * 7); }',java:'public class Main { public static void main(String[] args) { System.out.println(6 * 7); } }'};
type Language=keyof typeof starters;
type Result={code:number;output:string;truncated:boolean;stage:string;durationMs:number};

export default function CompilerPage(){
  const [language,setLanguage]=useState<Language>("javascript"),[code,setCode]=useState(starters.javascript),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(""),[running,setRunning]=useState(false),[tutorOpen,setTutorOpen]=useState(false);
  function changeLanguage(value:Language){setLanguage(value);setCode(starters[value]);setResult(null);setError("")}
  async function run(event:FormEvent){event.preventDefault();setRunning(true);setError("");setResult(null);try{const response=await fetch("/api/v1/compiler/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language,code})});const body=await response.json();if(!response.ok)throw new Error(body.error?.message||"Compilation failed");setResult(body)}catch(reason){setError(reason instanceof Error?reason.message:"Compilation failed")}finally{setRunning(false)}}
  return <ModuleShell active="Coding" title="Compiler" action={<Link className="secondary" href="/coding"><ArrowLeft/>Coding</Link>}><form className="compiler-workspace" onSubmit={run}><header><div><h2>Run code safely</h2><p>Each run uses a disposable, network-isolated workspace with time and output limits.</p></div><button className="secondary" type="button" onClick={()=>setTutorOpen(true)}><Sparkle/>Ask tutor</button><label>Language<select value={language} onChange={event=>changeLanguage(event.target.value as Language)}>{Object.keys(starters).map(item=><option key={item}>{item}</option>)}</select></label><button className="primary" disabled={running||!code.trim()}>{running?"Running…":<><Play/>Run</>}</button></header><label className="code-editor"><span>Source</span><textarea value={code} onChange={event=>setCode(event.target.value)} spellCheck={false} aria-label="Source code"/></label><section className="compiler-output" aria-live="polite"><header><Terminal/><strong>Output</strong>{result&&<small>{result.stage} · {result.durationMs} ms · exit {result.code}</small>}</header>{error?<div className="compiler-error" role="alert"><WarningCircle/><span>{error}</span></div>:result?<><div className={result.code===0?"compiler-success":"compiler-error"}>{result.code===0?<CheckCircle/>:<WarningCircle/>}<span>{result.code===0?"Run completed":"Run failed"}{result.truncated?" · output truncated":""}</span></div><pre><code>{result.output||"(no output)"}</code></pre></>:<p>Run the source to see compiler output.</p>}</section></form>{tutorOpen&&<TutorPanel kind="code" context={{name:`main.${language}`,language,code}} onApply={value=>value&&setCode(value)} onClose={()=>setTutorOpen(false)}/>}</ModuleShell>;
}
