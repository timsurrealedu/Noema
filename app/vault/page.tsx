"use client";

import {ChangeEvent, useEffect, useRef, useState} from "react";
import dynamic from "next/dynamic";
import {ArrowLeft, ArrowsIn, ArrowsOut, BookOpen, Clock, DownloadSimple, FileText, Folder, MagnifyingGlass, Plus, SidebarSimple, Sparkle, Star, Tag, Trash, UploadSimple, X} from "@phosphor-icons/react";
import {ModuleShell} from "../components/ModuleShell";
import {Note, useAppState} from "../components/AppState";
import {createId} from "../lib/id";
import {VaultOrganizer} from "../components/VaultOrganizer";
import {MarkdownToolbar} from "../components/MarkdownToolbar";
import {markdownKey} from "../lib/markdownEdit";
import {WikilinkCompletion} from "../components/WikilinkCompletion";
import {NoteAttachmentButton} from "../components/NoteAttachmentButton";
import {TutorPanel} from "../components/TutorPanel";
import {isVaultBackedNote} from "../lib/noteKind";

const MarkdownContent=dynamic(()=>import("../components/MarkdownContent").then(module=>module.MarkdownContent));
const MixedNoteEditor=dynamic(()=>import("../components/MixedNoteEditor").then(module=>module.MixedNoteEditor));

const blankNote=():Note=>({id:createId(),title:"Untitled note",excerpt:"",content:"# Untitled note\n\n",tags:[],time:"Now",ai:false,source:"Created in Noema"});
type Optimization={id:string;mode:string;state:string;before_content:string;after_content:string|null;summary:string|null;provider:string|null;error:string|null};
const renderMarkdown=(text:string,onNavigateNote?:(target:string)=>void)=><MarkdownContent text={text} onNavigateNote={onNavigateNote}/>;

export default function VaultPage(){
  const {notes,saveNote,trashNote}=useAppState();
  const [query,setQuery]=useState("");
  const [view,setView]=useState("All notes");
  const [folder,setFolder]=useState<string>(()=>typeof window!=="undefined"?new URLSearchParams(location.search).get("folder")||"": "");
  const [draft,setDraft]=useState<Note|null>(null);
  const [mode,setMode]=useState<"write"|"split"|"read">("read");
  const textarea=useRef<HTMLTextAreaElement>(null);
  const [tutorOpen,setTutorOpen]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const [showProperties,setShowProperties]=useState(true);
  const [mixedDirty,setMixedDirty]=useState(false);
  const [titleDirty,setTitleDirty]=useState(false);
  const titleTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const titleDirtyRef=useRef(false);
  const draftRef=useRef<Note|null>(null);
  const [optimizations,setOptimizations]=useState<Optimization[]>([]),[optimizing,setOptimizing]=useState(false),[optimizationError,setOptimizationError]=useState(""),[openError,setOpenError]=useState("");
  
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
    if(note)void openNote(note);
    else{
      fetch(`/api/v1/notes/${encodeURIComponent(param)}`)
        .then(async r=>{
          if(!r.ok)return;
          const data=await r.json();
          if(data&&data.id)void openNote(data);
        })
        .catch(()=>{});
    }
  },[notes]);

  useEffect(()=>{if(draft?.id)loadOptimizations(draft.id).catch(()=>{})},[draft?.id]);
  useEffect(()=>{draftRef.current=draft},[draft]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(mixedDirty||titleDirty){event.preventDefault();event.returnValue="";}};
    addEventListener("beforeunload",warn);
    return()=>removeEventListener("beforeunload",warn);
  },[mixedDirty,titleDirty]);
  function flushTitleSave(){
    if(titleTimer.current)clearTimeout(titleTimer.current);
    if(titleDirtyRef.current&&draftRef.current){saveNote(draftRef.current);titleDirtyRef.current=false;setTitleDirty(false)}
  }
  useEffect(()=>()=>flushTitleSave(),[draft?.id]);
  const filtered=notes.filter(note=>view==="Trash"?note.trashed:!note.trashed).filter(note=>view==="Favorites"?note.favorite:view==="Courses"?note.tags.some(tag=>["course","networking","database","study","operating-systems"].includes(tag)):view==="Projects"?note.tags.some(tag=>["revou","partnership","project"].includes(tag)):true).filter(note=>`${note.title} ${note.excerpt} ${note.tags}`.toLowerCase().includes(query.toLowerCase()));
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

  function closeNote(){
    flushTitleSave();
    if(draft?.relativePath&&draft.relativePath.includes("/")){
      const parent=draft.relativePath.split("/").slice(0,-1).join("/");
      setFolder(parent);
    }
    setDraft(null);
  }

  async function openNote(note:Note){
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
    setDraft({...loaded,tags:mergedTags});
  }
  function handleTitleChange(newTitle: string) {
    if (!draft) return;
    let newContent = draft.content || "";
    if (newContent && /^#\s+.*/.test(newContent)) {
      newContent = newContent.replace(/^#\s+.*/, `# ${newTitle}`);
    }
    let newRelativePath = draft.relativePath;
    if (newRelativePath) {
      const parentDir = newRelativePath.includes("/") ? newRelativePath.slice(0, newRelativePath.lastIndexOf("/") + 1) : "";
      const cleanName = newTitle.trim().replace(/[\/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim() || "Untitled";
      newRelativePath = `${parentDir}${cleanName}.md`;
    }
    const updated = {
      ...draft,
      title: newTitle,
      content: newContent,
      relativePath: newRelativePath
    };
    setDraft(updated);
    titleDirtyRef.current=true;setTitleDirty(true);
    if(titleTimer.current)clearTimeout(titleTimer.current);
    titleTimer.current=setTimeout(()=>{saveNote(updated);titleDirtyRef.current=false;setTitleDirty(false)},800);
  }

  function update(content:string){
    if(!draft)return;
    const title=content.match(/^# (.+)$/m)?.[1]||draft.title;
    let relativePath = draft.relativePath;
    if (relativePath && title !== draft.title) {
      const parentDir = relativePath.includes("/") ? relativePath.slice(0, relativePath.lastIndexOf("/") + 1) : "";
      const cleanName = title.trim().replace(/[\/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim() || "Untitled";
      relativePath = `${parentDir}${cleanName}.md`;
    }
    const updated = {
      ...draft,
      title,
      content,
      relativePath,
      excerpt:content.replace(/[#*_>-]/g,"").trim().slice(0,140)
    };
    setDraft(updated);
    if (title !== draft.title) {
      saveNote(updated);
    }
  }
  function save(){if(draft){if(!draft.sourceId)saveNote({...draft,time:"Now"});closeNote()}}
  function exportNote(){if(!draft)return;const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([draft.content],{type:"text/markdown"}));link.download=`${draft.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.md`;link.click();URL.revokeObjectURL(link.href)}
  function importNote(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(!file)return;file.text().then(content=>setDraft({...blankNote(),title:file.name.replace(/\.md$/i,""),content,source:`Imported Markdown · ${file.name}`}))}
  async function loadOptimizations(noteId:string){const response=await fetch(`/api/v1/notes/${noteId}/optimizations`),data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Could not load optimization");setOptimizations(data.optimizations)}
  async function optimize(){if(!draft)return;setOptimizing(true);setOptimizationError("");try{const saved=await fetch("/api/v1/notes",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":createId()},body:JSON.stringify({...draft,draft:true})}),savedNote=await saved.json();if(!saved.ok)throw new Error(savedNote.error?.message||"Save failed");setDraft({...draft,draft:true,version:savedNote.version});const response=await fetch(`/api/v1/notes/${draft.id}/optimizations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"organize"})}),result=await response.json();if(!response.ok)throw new Error(result.error?.message||"Optimization failed");for(let attempt=0;attempt<120;attempt++){await new Promise(resolve=>setTimeout(resolve,1000));const job=await (await fetch(`/api/v1/jobs/${result.jobId}`)).json();if(job.state==="completed"){await loadOptimizations(draft.id);return}if(["failed","cancelled"].includes(job.state))throw new Error(job.error||"Optimization failed")}throw new Error("Optimization is still running. Check again later.")}catch(reason){setOptimizationError((reason as Error).message)}finally{setOptimizing(false)}}
  async function decide(item:Optimization,action:"apply"|"reject"){const response=await fetch(`/api/v1/notes/optimizations/${item.id}/${action}`,{method:"POST",headers:action==="apply"?{"Idempotency-Key":createId()}:undefined});const data=await response.json();if(!response.ok){setOptimizationError(data.error?.message||"Action failed");return}if(action==="apply")location.reload();else loadOptimizations(draft!.id)}
  if(!draft)return <ModuleShell active="Vault" title="Vault">{openError&&<div className="tutor-error" role="alert">{openError}</div>}<VaultOrganizer notes={notes} onOpen={openNote} initialFolder={folder} onFolderChange={setFolder}/></ModuleShell>
  const isVaultNote=isVaultBackedNote(draft);
  const toggleFullscreen = () => {
    setFullscreen(value => {
      const next = !value;
      if (next) setShowProperties(false);
      return next;
    });
  };
  if(isVaultNote&&draft) {
    return (
      <ModuleShell active="Vault" title="Vault">
        <section className={`note-workspace mixed-workspace ${fullscreen ? "fullscreen" : ""} ${!showProperties ? "hide-inspector" : ""}`}>
          <header className="note-toolbar">
            <button className="icon-button" aria-label="Back to notes" onClick={closeNote}><ArrowLeft /></button>
            <span className="mixed-note-path">{draft.relativePath || draft.title}</span>
            <button className={`secondary note-secondary-action ${showProperties ? "active" : ""}`} title={showProperties ? "Hide properties" : "Show properties"} aria-label="Toggle properties panel" onClick={() => setShowProperties(v => !v)}><SidebarSimple /><span>Properties</span></button>
            <button className="secondary note-secondary-action tutor-action" onClick={() => setTutorOpen(true)}><Sparkle />Tutor</button>
            <button className="secondary note-secondary-action" onClick={exportNote}><DownloadSimple /><span>Export</span></button>
            <button className="icon-button secondary fullscreen-toggle" title={fullscreen ? "Exit fullscreen" : "Fullscreen"} aria-label={fullscreen ? "Exit fullscreen" : "Open note fullscreen"} onClick={toggleFullscreen}>{fullscreen ? <ArrowsIn /> : <ArrowsOut />}</button>
          </header>
          <MixedNoteEditor noteId={draft.id} initialContent={draft.content} initialInk={new URLSearchParams(location.search).get("ink") === "1"} onNavigateNote={navigateToNote} onDirtyChange={setMixedDirty} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />
          <aside className="note-inspector">
            <div className="object-inspector-head"><div><span>Properties</span></div><button className="icon-button" aria-label="Collapse properties panel" title="Collapse properties panel" onClick={() => setShowProperties(false)}><X /></button></div>
            <label>Title<input value={draft.title} onChange={e => handleTitleChange(e.target.value)} /></label>
            <label>Tags<input value={draft.tags.join(", ")} onChange={e => setDraft({ ...draft, tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })} placeholder="e.g. course, binus, bncc" /></label>
            {draft.tags.length > 0 && <div className="tag-pills">{draft.tags.map(tag => <span className="tag-pill" key={tag}>#{tag}</span>)}</div>}
            <div><small>Source</small><strong>{draft.source}</strong></div>
            <div><small>Sync</small><strong>{draft.syncState || "synced"}</strong></div>
            <div><small>Blocks</small><strong>{draft.blocks?.length || 1} ordered blocks</strong></div>
          </aside>
        </section>
        {tutorOpen && <TutorPanel kind="note" context={{ id: draft.id, title: draft.title, content: draft.content }} onApply={() => { }} onClose={() => setTutorOpen(false)} />}
      </ModuleShell>
    );
  }

  if (draft) {
    const proposal = optimizations.find(item => item.state === "ready");
    return (
      <ModuleShell active="Vault" title="Vault">
        <section className={`note-workspace ${fullscreen ? "fullscreen" : ""} ${!showProperties ? "hide-inspector" : ""}`}>
          <header className="note-toolbar">
            <button className="icon-button" aria-label="Back to notes" onClick={closeNote}><ArrowLeft /></button>
            <div className="mode-switch" role="group" aria-label="Editor view">{(["write", "split", "read"] as const).map(item => <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item}</button>)}</div>
            <button className={`secondary note-secondary-action ${showProperties ? "active" : ""}`} title={showProperties ? "Hide properties" : "Show properties"} aria-label="Toggle properties panel" onClick={() => setShowProperties(v => !v)}><SidebarSimple /><span>Properties</span></button>
            <button className="secondary note-secondary-action" onClick={() => setTutorOpen(true)}><Sparkle />Tutor</button>
            {draft.draft && <button className="secondary note-secondary-action" disabled={optimizing} onClick={optimize}><Sparkle /><span>{optimizing ? "Optimizing…" : "Optimize draft"}</span></button>}
            <button className="secondary note-secondary-action" onClick={exportNote}><DownloadSimple /><span>Export</span></button>
            <button className="icon-button secondary fullscreen-toggle" title={fullscreen ? "Exit fullscreen" : "Fullscreen"} aria-label={fullscreen ? "Exit fullscreen" : "Open note fullscreen"} onClick={() => setFullscreen(value => !value)}>{fullscreen ? <ArrowsIn /> : <ArrowsOut />}</button>
            <button className="icon-button danger note-secondary-action" aria-label="Move note to trash" onClick={() => { trashNote(draft.id); closeNote() }}><Trash /></button>
          </header>
          <div className={`note-editor ${mode}`}>
            <div className="markdown-write">
              <MarkdownToolbar textarea={textarea} onChange={update} />
              <NoteAttachmentButton textarea={textarea} onChange={update} />
              <textarea ref={textarea} aria-label="Markdown note" value={draft.content} onChange={e => update(e.target.value)} onKeyDown={event => markdownKey(event, update)} spellCheck />
              <WikilinkCompletion textarea={textarea} value={draft.content} onChange={update} />
            </div>
            {mode !== "write" && <article className="markdown-preview">{renderMarkdown(draft.content, navigateToNote)}</article>}
          </div>
          <aside className="note-inspector">
            <div className="object-inspector-head"><div><span>Note details</span><small>Portable Markdown with its source intact.</small></div><button className="icon-button" aria-label="Collapse properties panel" title="Collapse properties panel" onClick={() => setShowProperties(false)}><X /></button></div>
            <label>Title<input value={draft.title} onChange={e => handleTitleChange(e.target.value)} /></label>

            <label>Tags<input value={draft.tags.join(", ")} onChange={e => setDraft({ ...draft, tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })} placeholder="e.g. course, binus, bncc" /></label>
            {draft.tags.length > 0 && <div className="tag-pills">{draft.tags.map(tag => <span className="tag-pill" key={tag}>#{tag}</span>)}</div>}
            <label className="check-field"><input type="checkbox" checked={!!draft.draft} onChange={e => setDraft({ ...draft, draft: e.target.checked })} /> Draft note</label>
            <div><small>Source</small><strong>{draft.source}</strong></div>
            <div><small>Relationships</small><strong>{draft.tags.length || 0} related topics</strong></div>
            {draft.ai && <div className="ai-provenance"><Sparkle /><span><strong>AI-assisted</strong><small>Generated content remains identified.</small></span></div>}
          </aside>
        </section>
        {optimizationError && <div className="tutor-error" role="alert">{optimizationError}</div>}
        {proposal && <section className="optimization-review"><header><div><h2>Optimization review</h2><p>{proposal.summary}</p></div><small>{proposal.provider} · {proposal.mode}</small></header><div><article><h3>Original</h3><pre>{proposal.before_content}</pre></article><article><h3>Proposed</h3><pre>{proposal.after_content}</pre></article></div><footer><button className="secondary" onClick={() => decide(proposal, "reject")}>Reject</button><button className="primary" onClick={() => decide(proposal, "apply")}>Apply proposal</button></footer></section>}
        {tutorOpen && <TutorPanel kind="note" context={{ id: draft.id, title: draft.title, content: draft.content }} onApply={value => update(`${draft.content.trim()}\n\n${value.trim()}\n`)} onClose={() => setTutorOpen(false)} />}
      </ModuleShell>
    );
  }
}
