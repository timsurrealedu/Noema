"use client";

import {useEffect, useRef, useState} from "react";
import dynamic from "next/dynamic";
import {ArrowLeft, ArrowsIn, ArrowsOut, DotsThree, DownloadSimple, FileText, SidebarSimple, Sparkle, Trash, X} from "@phosphor-icons/react";
import {ModuleShell} from "../components/ModuleShell";
import {Note, useAppState} from "../components/AppState";
import {VaultOrganizer} from "../components/VaultOrganizer";
import {createId} from "../lib/id";
import {TutorPanel} from "../components/TutorPanel";

const MixedNoteEditor=dynamic(()=>import("../components/MixedNoteEditor").then(module=>module.MixedNoteEditor));
type MixedEditorHandle=import("../components/MixedNoteEditor").MixedEditorHandle;

type Optimization={id:string;mode:string;state:string;before_content:string;after_content:string|null;summary:string|null;provider:string|null;error:string|null;operations?:{type:string;start:number;end:number;replacement:string;reason:string}[]};
const optimizeModes=["light","organize","study","technical","voice"] as const;
type OptimizeMode=(typeof optimizeModes)[number];
const optimizeModeLabels:Record<OptimizeMode,string>={light:"Light polish",organize:"Organize",study:"Study notes",technical:"Technical",voice:"Keep my voice"};

export default function VaultPage(){
  const {notes,trashNote}=useAppState();
  const [folder,setFolder]=useState<string>(()=>typeof window!=="undefined"?new URLSearchParams(location.search).get("folder")||"": "");
  const [draft,setDraft]=useState<Note|null>(null);
  const [tutorOpen,setTutorOpen]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const [showProperties,setShowProperties]=useState(false);
  const [mixedDirty,setMixedDirty]=useState(false);
  const [titleDirty,setTitleDirty]=useState(false);
   const titleTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
   const titleDirtyRef=useRef(false);
   const draftRef=useRef<Note|null>(null);
   const mixedRef=useRef<MixedEditorHandle|null>(null);
  const [openError,setOpenError]=useState("");
  const [optimizations,setOptimizations]=useState<Optimization[]>([]),[optimizing,setOptimizing]=useState(false),[optimizationError,setOptimizationError]=useState("");
  const [optimizeMode,setOptimizeMode]=useState<OptimizeMode>("organize");
  useEffect(()=>{if(draft?.id)void loadOptimizations(draft.id).catch(()=>{})},[draft?.id]);
  
  function findNoteByNameOrId(target:string):Note|undefined{
    const norm=decodeURIComponent(target).trim().toLowerCase();
    return notes.find(item=>
      item.id===target||
      item.title.toLowerCase()===norm||
      item.title.toLowerCase()===norm.replace(/\.md$/i,"")||
      item.relativePath?.toLowerCase()===norm||
      item.relativePath?.toLowerCase().replace(/\.md$/i,"")===norm||
      (item.relativePath&&item.relativePath.split("/").pop()?.toLowerCase().replace(/\.md$/i,"")===norm)
    );
  }

  function navigateToNote(target:string){
    const found=findNoteByNameOrId(target);
    if(found)void openNote(found);
  }

  useEffect(()=>{
    const param=new URLSearchParams(location.search).get("open");
    if(!param)return;
    const note=findNoteByNameOrId(param);
    if(note)void openNote(note,false);
    else{
      fetch(`/api/v1/notes/${encodeURIComponent(param)}`)
        .then(async r=>{
          if(!r.ok)return;
          const data=await r.json();
          if(data&&data.id)void openNote(data,false);
        })
        .catch(()=>{});
    }
  },[notes]);

  useEffect(()=>{const params=new URLSearchParams(location.search);if(folder)params.set("folder",folder);else params.delete("folder");history.replaceState(null,"",`${location.pathname}${params.size?`?${params}`:""}`)},[folder]);
  useEffect(()=>{
    const restore=()=>{
      const params=new URLSearchParams(location.search),open=params.get("open");
      setFolder(params.get("folder")||"");
      if(!open){setDraft(null);return}
      const note=findNoteByNameOrId(open);
      if(note&&note.id!==draftRef.current?.id)void openNote(note,false);
    };
    addEventListener("popstate",restore);
    return()=>removeEventListener("popstate",restore);
  },[notes]);
  useEffect(()=>{draftRef.current=draft},[draft]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(mixedDirty||titleDirty){event.preventDefault();event.returnValue="";}};
    addEventListener("beforeunload",warn);
    return()=>removeEventListener("beforeunload",warn);
  },[mixedDirty,titleDirty]);
  async function flushTitleSave(){
    if(titleTimer.current)clearTimeout(titleTimer.current);
    if(titleDirtyRef.current&&draftRef.current){
      await mixedRef.current?.rename(draftRef.current.title.trim()||"Untitled note");
      titleDirtyRef.current=false;setTitleDirty(false);
    }
  }
  async function saveTags(){
    const current=draftRef.current;
    if(!current)return;
    try{
      if(mixedRef.current&&!await mixedRef.current.flush())return;
      const response=await fetch(`/api/v1/notes/${current.id}`),fresh=await response.json();
      if(!response.ok)throw new Error(fresh.error?.message||"Could not load note properties");
      const saved=await fetch("/api/v1/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...fresh,tags:current.tags})});
      if(!saved.ok)throw new Error((await saved.json()).error?.message||"Could not save tags");
    }catch(reason){setOpenError((reason as Error).message)}
  }

  function extractTagsFromContent(content:string):string[]{
    if(!content||typeof content!=="string")return[];
    const set=new Set<string>();
    const fmMatch=content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if(fmMatch){
      const yaml=fmMatch[1];
      const tagMatch=yaml.match(/^(?:tags|tag):\s*([\s\S]*?)(?=\n[a-z0-9_-]+:|$)/mi);
      if(tagMatch){
        const section=tagMatch[1].trim();
        if(section.startsWith("-")){
          for(const line of section.split(/\r?\n/)){
            const item=line.replace(/^\s*-\s*/,"").trim().replace(/^['"]|['"]$/g,"");
            if(item)set.add(item.replace(/^#/,""));
          }
        }else if(section.startsWith("[")){
          for(const item of section.replace(/^\[|\]$/g,"").split(",")){
            const cleaned=item.trim().replace(/^['"]|['"]$/g,"");
            if(cleaned)set.add(cleaned.replace(/^#/,""));
          }
        }else{
          for(const item of section.split(/[, \t]+/)){
            const cleaned=item.trim().replace(/^['"]|['"]$/g,"");
            if(cleaned)set.add(cleaned.replace(/^#/,""));
          }
        }
      }
    }
    for(const match of content.matchAll(/(?<=\s|^)#([a-zA-Z0-9_\-\/]+)(?=\s|$)/g)){
      const tag=match[1].trim();
      if(tag&&!/^\d+$/.test(tag))set.add(tag);
    }
    return Array.from(set);
  }

  async function closeNote(){
    if(mixedRef.current && !await mixedRef.current.flush())return;
    try{await flushTitleSave()}catch(reason){setOpenError((reason as Error).message);return}
    if(draft?.relativePath&&draft.relativePath.includes("/")){
      const parent=draft.relativePath.split("/").slice(0,-1).join("/");
      setFolder(parent);
    }
    const params=new URLSearchParams(location.search);
    params.delete("open");
    params.delete("ink");
    history.replaceState(null,"",`${location.pathname}${params.size?`?${params}`:""}`);
    setDraft(null);
  }

  async function openNote(note:Note,addHistory=true){
    if(draftRef.current?.id===note.id)return;
    try{await flushTitleSave()}catch(reason){setOpenError((reason as Error).message);return}
    if(mixedRef.current && !await mixedRef.current.flush())return;
    const fallback=`# ${note.title}\n\n${note.excerpt}`;
    setOpenError("");
    let loaded={...note};
    if(note.content===undefined){
      try{
        const response=await fetch(`/api/v1/notes/${note.id}`),data=await response.json();
        if(!response.ok)throw new Error(data.error?.message||"Could not open note");
        loaded={...note,...data,content:data.content||fallback};
      }catch(reason){
        setOpenError(reason instanceof Error?reason.message:"Could not open note");
      }
    }
    const extracted=extractTagsFromContent(loaded.content||"");
    const mergedTags=Array.from(new Set([...(loaded.tags||[]),...extracted]));
    if(loaded.relativePath&&loaded.relativePath.includes("/")){
      const parent=loaded.relativePath.split("/").slice(0,-1).join("/");
      setFolder(parent);
    }
    if(addHistory){
      const params=new URLSearchParams(location.search);
      const parent=loaded.relativePath?.includes("/")?loaded.relativePath.split("/").slice(0,-1).join("/"):"";
      if(parent)params.set("folder",parent);else params.delete("folder");
      params.set("open",loaded.id);
      params.delete("ink");
      history.pushState(null,"",`${location.pathname}?${params}`);
    }
    setDraft({...loaded,tags:mergedTags});
  }
  function handleTitleChange(newTitle: string) {
    if (!draft) return;
    setDraft({...draft,title:newTitle});
    titleDirtyRef.current=true;setTitleDirty(true);
    if(titleTimer.current)clearTimeout(titleTimer.current);
    titleTimer.current=setTimeout(async()=>{
      try{
        await mixedRef.current?.rename(newTitle.trim()||"Untitled note");
        titleDirtyRef.current=false;setTitleDirty(false);
      }catch(reason){setOpenError((reason as Error).message)}
    },800);
  }

  async function exportNote(){
    if(!draft||mixedRef.current&&!await mixedRef.current.flush())return;
    try{
      const response=await fetch(`/api/v1/notes/${draft.id}`),note=await response.json();
      if(!response.ok)throw new Error(note.error?.message||"Could not export note");
      const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([note.content],{type:"text/markdown"}));link.download=`${note.title.replace(/[\\/:*?"<>|]/g,"-")}.md`;link.click();URL.revokeObjectURL(link.href);
    }catch(reason){setOpenError((reason as Error).message)}
  }

  async function exportPdf(){if(draft&&(!mixedRef.current||await mixedRef.current.flush()))location.assign(`/api/v1/notes/${draft.id}/export?format=pdf`)}
  async function loadOptimizations(noteId:string){const response=await fetch(`/api/v1/notes/${noteId}/optimizations`),data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Could not load optimization");setOptimizations(data.optimizations)}
  async function optimize(mode:OptimizeMode=optimizeMode){if(!draft)return;setOptimizing(true);setOptimizationError("");try{if(mixedRef.current&&!await mixedRef.current.flush())throw new Error("Save pending edits before optimizing");const response=await fetch(`/api/v1/notes/${draft.id}/optimizations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode})}),result=await response.json();if(!response.ok)throw new Error(result.error?.message||"Optimization failed");for(let attempt=0;attempt<120;attempt++){await new Promise(resolve=>setTimeout(resolve,1000));const job=await (await fetch(`/api/v1/jobs/${result.jobId}`)).json();if(job.state==="completed"){await loadOptimizations(draft.id);return}if(["failed","cancelled"].includes(job.state))throw new Error(job.error||"Optimization failed")}throw new Error("Optimization is still running. Check again later.")}catch(reason){setOptimizationError((reason as Error).message)}finally{setOptimizing(false)}}
  async function decide(item:Optimization,action:"apply"|"reject"){const response=await fetch(`/api/v1/notes/optimizations/${item.id}/${action}`,{method:"POST",headers:action==="apply"?{"Idempotency-Key":createId()}:undefined});const data=await response.json();if(!response.ok){setOptimizationError(data.error?.message||"Action failed");return}if(action==="apply")location.reload();else loadOptimizations(draft!.id)}
  if(!draft)return <ModuleShell active="Vault" title="Vault">{openError&&<div className="tutor-error" role="alert">{openError}</div>}<VaultOrganizer notes={notes} onOpen={openNote} initialFolder={folder} onFolderChange={setFolder}/></ModuleShell>
  const toggleFullscreen = () => {
    setFullscreen(value => {
      const next = !value;
      if (next) setShowProperties(false);
      return next;
    });
  };
  if(draft) {
    const proposal=optimizations.find(item=>item.state==="ready");
    return (
      <ModuleShell active="Vault" title="Vault">
        {openError&&<div className="tutor-error" role="alert">{openError}</div>}
        <section className={`note-workspace mixed-workspace ${fullscreen ? "fullscreen" : ""} ${!showProperties ? "hide-inspector" : ""}`}>
          <header className="note-toolbar">
            <button className="icon-button" aria-label="Back to notes" onClick={()=>void closeNote()}><ArrowLeft /></button>
            <span className="mixed-note-path">{draft.relativePath||draft.title}</span>
            <button className="secondary note-secondary-action tutor-action" onClick={()=>setTutorOpen(true)}><Sparkle />Tutor</button>
            <details className="note-actions-menu">
              <summary aria-label="Note actions"><DotsThree /></summary>
              <div>
                <button type="button" onClick={()=>setShowProperties(value=>!value)}><SidebarSimple />{showProperties?"Hide properties":"Show properties"}</button>
                <button type="button" onClick={()=>void exportNote()}><DownloadSimple />Export Markdown</button>
                <button type="button" onClick={()=>void exportPdf()}><FileText />Export PDF</button>
                <button type="button" onClick={toggleFullscreen}>{fullscreen?<ArrowsIn />:<ArrowsOut />}{fullscreen?"Exit fullscreen":"Fullscreen"}</button>
              </div>
            </details>
          </header>
          <MixedNoteEditor key={draft.id} ref={mixedRef} noteId={draft.id} initialContent={draft.content} initialInk={new URLSearchParams(location.search).get("ink") === "1"} onNavigateNote={navigateToNote} onDirtyChange={setMixedDirty} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />
          <aside className="note-inspector">
            <div className="object-inspector-head"><div><span>Properties</span></div><button className="icon-button" aria-label="Collapse properties panel" title="Collapse properties panel" onClick={() => setShowProperties(false)}><X /></button></div>
            <label>Title<input value={draft.title} onChange={e => handleTitleChange(e.target.value)} /></label>
            <label>Tags<input value={draft.tags.join(", ")} onBlur={() => void saveTags()} onChange={e => setDraft({ ...draft, tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })} placeholder="e.g. course, binus, bncc" /></label>
            {draft.tags.length > 0 && <div className="tag-pills">{draft.tags.map(tag => <span className="tag-pill" key={tag}>#{tag}</span>)}</div>}
            <div><small>Source</small><strong>{draft.source}</strong></div>
            <div><small>Sync</small><strong>{draft.syncState || (draft.sourceId ? "synced" : "Local")}</strong></div>
            <div><small>Blocks</small><strong>{draft.blocks?.length || 1} ordered blocks</strong></div>
          </aside>
        </section>
        {optimizationError && <div className="tutor-error" role="alert">{optimizationError}</div>}
        {proposal && <section className="optimization-review"><header><div><h2>Optimization review</h2><p>{proposal.summary}</p></div><small>{proposal.provider} · {proposal.mode}</small></header><div>
          {(proposal.operations||[]).length>0 ? (
            <ol className="optimization-operations">
              {proposal.operations!.map((operation,index)=>{
                const context=proposal.before_content.slice(Math.max(0,operation.start-40),operation.start);
                return <li key={index}><small className="op-reason">{operation.reason}</small><del>{context.trim()||"(start of note)"}</del><ins>{operation.replacement.slice(0,400)}</ins></li>;
              })}
            </ol>
          ) : null}
          <details><summary>Full original</summary><pre>{proposal.before_content}</pre></details>
          <details open={!proposal.operations?.length}><summary>Full proposal</summary><pre>{proposal.after_content}</pre></details>
        </div><footer><button className="secondary" onClick={() => decide(proposal, "reject")}>Reject</button><button className="primary" onClick={() => decide(proposal, "apply")}>Apply proposal</button></footer></section>}
        {tutorOpen && <TutorPanel kind="note" context={{ id: draft.id, title: draft.title, content: draft.content }} onApply={() => mixedRef.current?.refresh()} getInsertAfter={() => mixedRef.current?.getActiveBlock()} onClose={() => setTutorOpen(false)} />}
      </ModuleShell>
    );
  }

  return null;
}
