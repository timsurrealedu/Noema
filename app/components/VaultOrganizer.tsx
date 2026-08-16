"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowClockwise,CaretDown,CaretRight,FilePlus,FileText,Folder,FolderOpen,FolderPlus,House,MagnifyingGlass,PencilSimple,ShareNetwork,SidebarSimple,Star,Tag,Trash} from "@phosphor-icons/react";
import type {Note} from "./AppState";
import {KnowledgeGraphView} from "./KnowledgeGraphView";
import {useActionDialog} from "./ActionDialog";

type VaultSource={id:string;name:string;state:string;last_sync_at?:string;lastResult?:{conflicts?:number}};
type TreeNote={name:string;path:string;noteId:string;syncState:string};
type Tree={name:string;path:string;folders:Tree[];notes:TreeNote[]};
type DragPayload={type:"note"|"folder";path:string;name:string;noteId?:string};

const request = async (path: string, options?: RequestInit) => {
  const response = await fetch(path, options);
  const contentType = response.headers.get("content-type") || "";
  let data: any = {};
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {}
  }
  if (!response.ok) throw new Error(data.error?.message || `Vault request failed (${response.status})`);
  return data;
};

function TreeFolder({node,current,onSelect,onOpenNote,dragTarget,dragItem,onDragStart,onDragOver,onDragLeave,onDrop}:{node:Tree;current:string;onSelect:(path:string)=>void;onOpenNote:(id:string)=>void;dragTarget:string|null;dragItem:DragPayload|null;onDragStart:(e:React.DragEvent,item:DragPayload)=>void;onDragOver:(e:React.DragEvent,path:string)=>void;onDragLeave:(e:React.DragEvent)=>void;onDrop:(e:React.DragEvent,targetPath:string)=>void}){
  const [open,setOpen]=useState(false);
  const isDropTarget=dragTarget===node.path;
  const isDraggingSelf=dragItem?.path===node.path;
  return (
    <div className="vault-tree-folder">
      <div className="vault-tree-folder-row">
        <button className="vault-tree-disclosure" aria-label={`${open?"Collapse":"Expand"} ${node.name}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
          {open?<CaretDown/>:<CaretRight/>}
        </button>
        <button
        className={`${current===node.path?"active":""} ${isDropTarget?"drag-over":""} ${isDraggingSelf?"dragging":""}`}
        draggable
        onDragStart={e=>onDragStart(e,{type:"folder",path:node.path,name:node.name})}
        onDragOver={e=>onDragOver(e,node.path)}
        onDragLeave={onDragLeave}
        onDrop={e=>onDrop(e,node.path)}
        onClick={()=>onSelect(node.path)}
      >
        {open?<FolderOpen/>:<Folder/>}
        <span>{node.name}</span>
        <small>{node.notes.length+node.folders.length}</small>
      </button>
      </div>
      {open&&<div className="vault-tree-children">{node.folders.map(folder=><TreeFolder node={folder} current={current} onSelect={onSelect} onOpenNote={onOpenNote} dragTarget={dragTarget} dragItem={dragItem} onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} key={folder.path}/>)}{node.notes.map(note=><button className="vault-tree-note" onClick={()=>onOpenNote(note.noteId)} key={note.noteId}><FileText/><span>{note.name.replace(/\.md$/i,"")}</span></button>)}</div>}
    </div>
  );
}

function findFolder(root:Tree,path:string):Tree{if(!path)return root;for(const folder of root.folders){if(folder.path===path)return folder;if(path.startsWith(`${folder.path}/`))return findFolder(folder,path)}return root}

export function VaultOrganizer({notes,onOpen,initialFolder="",onFolderChange}:{notes:Note[];onOpen:(note:Note)=>void;initialFolder?:string;onFolderChange?:(folder:string)=>void}){
  const {requestAction}=useActionDialog();
  const [sources,setSources]=useState<VaultSource[]>([]),[sourceId,setSourceId]=useState(""),[tree,setTree]=useState<Tree|null>(null),[folder,setFolderState]=useState<string>(()=>initialFolder||(typeof window!=="undefined"?new URLSearchParams(location.search).get("folder")||"": "")),[query,setQuery]=useState(""),[drawer,setDrawer]=useState(false),[busy,setBusy]=useState(false),[initialLoading,setInitialLoading]=useState(true),[error,setError]=useState(""),[showGraph,setShowGraph]=useState(false),startedInk=useRef(false);
  const [dragItem,setDragItem]=useState<DragPayload|null>(null);
  const [dragTarget,setDragTarget]=useState<string|null>(null);
  const noteMap=useMemo(()=>({get:(id:string)=>notes.find(note=>note.id===id)||({id,title:"Note",excerpt:"",tags:[],time:"",ai:false} as unknown as Note)}),[notes]);

  const setFolder=(path:string)=>{
    setFolderState(path);
    if(onFolderChange)onFolderChange(path);
  };

  useEffect(()=>{
    if(initialFolder!==undefined&&initialFolder!==folder){
      setFolderState(initialFolder);
    }
  },[initialFolder]);

  async function load(preferred=sourceId){try{const data=await request(`/api/v1/vault-sources?tree=true${preferred?`&sourceId=${encodeURIComponent(preferred)}`:""}`);setSources(data.sources);setSourceId(data.selectedSourceId);setTree(data.tree);if(new URLSearchParams(location.search).get("new")==="ink"&&data.selectedSourceId&&!startedInk.current){startedInk.current=true;void create(`Handwritten note ${new Date().toISOString().slice(0,19).replace(/[T:]/g,"-")}`,data.selectedSourceId,true)}}catch(reason){setError((reason as Error).message)}finally{setInitialLoading(false)}}
  useEffect(()=>{setDrawer(localStorage.getItem("noema-vault-drawer")==="open");void load()},[]);

  async function sync(){if(!sourceId)return;setBusy(true);try{await request(`/api/v1/vault-sources/${sourceId}/sync`,{method:"POST"});await load(sourceId)}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}}

  async function create(givenName?:string,selected=sourceId,ink=false){if(!selected)return;const name=givenName||await requestAction({title:"New note",input:{label:"Note name"},confirmLabel:"Create"});if(!name)return;const file=`${name.replace(/\.md$/i,"").replace(/[\\/:*?\"<>|]/g,"-").trim()}.md`,relativePath=folder&&!folder.startsWith("@")?`${folder}/${file}`:file;try{const created=await request(`/api/v1/vault-sources/${selected}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath})});await load(selected);location.assign(`/vault?open=${created.noteId}${ink?"&ink=1":""}`)}catch(reason:any){if(givenName&&reason?.message?.includes("already exists")){const altFile=`${name.replace(/\.md$/i,"").replace(/[\\/:*?\"<>|]/g,"-").trim()}-${Math.floor(Math.random()*1000)}.md`,altPath=folder&&!folder.startsWith("@")?`${folder}/${altFile}`:altFile;try{const retryCreated=await request(`/api/v1/vault-sources/${selected}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath:altPath})});await load(selected);location.assign(`/vault?open=${retryCreated.noteId}${ink?"&ink=1":""}`);return}catch{}}setError((reason as Error).message)}}

  async function createFolder(){if(!sourceId)return;const name=await requestAction({title:"New folder",input:{label:"Folder name"},confirmLabel:"Create"});if(!name)return;const cleanName=name.replace(/[\\/:*?\"<>|]/g,"-").trim();if(!cleanName)return;const folderPath=folder&&!folder.startsWith("@")?`${folder}/${cleanName}`:cleanName;const relativePath=`${folderPath}/Untitled note.md`;setBusy(true);try{const created=await request(`/api/v1/vault-sources/${sourceId}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath})});setFolder(folderPath);await load(sourceId);if(created.noteId)location.assign(`/vault?open=${created.noteId}`)}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}}

  async function move(item:TreeNote){const to=await requestAction({title:"Move or rename note",input:{label:"Path",initialValue:item.path},confirmLabel:"Continue"});if(!to||to===item.path)return;try{const preview=await request(`/api/v1/vault-sources/${sourceId}/entries/move`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:item.path,to,preview:true})});if(preview.backlinks.length&&!await requestAction({title:"Update links?",detail:`Update links in ${preview.backlinks.length} note(s)?`,confirmLabel:"Update"}))return;await request(`/api/v1/vault-sources/${sourceId}/entries/move`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:item.path,to})});await load(sourceId)}catch(reason){setError((reason as Error).message)}}

  async function trash(item:TreeNote){if(!await requestAction({title:"Move to trash?",detail:`Move ${item.path} to recoverable Obsidian trash?`,confirmLabel:"Move to trash",danger:true}))return;try{await request(`/api/v1/vault-sources/${sourceId}/entries/trash`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath:item.path})});await load(sourceId)}catch(reason){setError((reason as Error).message)}}

  function handleDragStart(e:React.DragEvent,item:DragPayload){
    setDragItem(item);
    e.dataTransfer.setData("application/json",JSON.stringify(item));
    e.dataTransfer.effectAllowed="move";
  }

  function handleDragOver(e:React.DragEvent,targetPath:string){
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect="move";
    if(dragTarget!==targetPath)setDragTarget(targetPath);
  }

  function handleDragLeave(e:React.DragEvent){
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleDrop(e:React.DragEvent,targetFolderPath:string){
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);
    let payload=dragItem;
    if(!payload){
      try{const str=e.dataTransfer.getData("application/json");if(str)payload=JSON.parse(str)}catch{}
    }
    if(!payload||!sourceId)return;
    const {type,path:sourcePath}=payload;
    if(!sourcePath||sourcePath===targetFolderPath)return;
    if(type==="folder"&&targetFolderPath.startsWith(`${sourcePath}/`)){
      setError("Cannot move a folder into its own subfolder");
      return;
    }
    setBusy(true);
    try{
      if(type==="note"){
        const fileName=sourcePath.split("/").pop()||"";
        const toPath=targetFolderPath?`${targetFolderPath}/${fileName}`:fileName;
        if(toPath===sourcePath)return;
        const preview=await request(`/api/v1/vault-sources/${sourceId}/entries/move`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:sourcePath,to:toPath,preview:true})});
        if(preview.backlinks.length&&!await requestAction({title:"Update links?",detail:`Update links in ${preview.backlinks.length} note(s)?`,confirmLabel:"Update"}))return;
        await request(`/api/v1/vault-sources/${sourceId}/entries/move`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:sourcePath,to:toPath})});
      }else if(type==="folder"){
        const folderName=sourcePath.split("/").pop()||"";
        const targetSubFolder=targetFolderPath?`${targetFolderPath}/${folderName}`:folderName;
        if(targetSubFolder===sourcePath)return;
        const findNode=(root:Tree|null,path:string):Tree|null=>{if(!root)return null;if(root.path===path)return root;for(const f of root.folders){const res=findNode(f,path);if(res)return res}return null};
        const folderNode=findNode(tree,sourcePath);
        const collectNotes=(node:Tree):TreeNote[]=>{let res=[...node.notes];for(const f of node.folders)res=res.concat(collectNotes(f));return res};
        const notesToMove=folderNode?collectNotes(folderNode):[];
        for(const childNote of notesToMove){
          const subPath=childNote.path.slice(sourcePath.length+1);
          const destination=`${targetSubFolder}/${subPath}`;
          await request(`/api/v1/vault-sources/${sourceId}/entries/move`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:childNote.path,to:destination})});
        }
      }
      await load(sourceId);
    }catch(reason){setError((reason as Error).message)}finally{setDragItem(null);setBusy(false)}
  }

  const current=tree&&!folder.startsWith("@")?findFolder(tree,folder):null,source=sources.find(item=>item.id===sourceId),views:{id:string;label:string;icon:typeof House}[]=[{id:"@all",label:"All notes",icon:House},{id:"@favorites",label:"Favorites",icon:Star},{id:"@tags",label:"Tags",icon:Tag},{id:"@local",label:"Local",icon:FileText},{id:"@trash",label:"Trash",icon:Trash}],specialNotes=folder==="@all"?notes.filter(note=>!note.trashed):folder==="@favorites"?notes.filter(note=>note.favorite&&!note.trashed):folder==="@tags"?notes.filter(note=>note.tags.length&&!note.trashed):folder==="@local"?notes.filter(note=>!note.sourceId&&!note.trashed):folder==="@trash"?notes.filter(note=>note.trashed):[];

  const queryLower=query.trim().toLowerCase();
  const visible=(folder.startsWith("@")?specialNotes.map(note=>({name:`${note.title}.md`,path:note.relativePath||"Local",noteId:note.id,syncState:note.syncState||"local"})):current?.notes||[]).filter(item=>{
    if(!queryLower)return true;
    const note=noteMap.get(item.noteId);
    const text=`${item.name} ${item.path} ${note?.title||""} ${note?.excerpt||""} ${note?.tags?.join(" ")||""} ${note?.content||""}`.toLowerCase();
    return text.includes(queryLower);
  });

  const title=views.find(view=>view.id===folder)?.label||folder.split("/").at(-1)||source?.name;
  const isRootView=!folder&&!query;
  const isVaultNameHeading=!folder||title===source?.name;
  const showSubnavTabs=!folder||folder.startsWith("@")||title===source?.name;
  const folderCount=current?.folders.length||0;
  const noteCount=visible.length;

  const recentNotes=useMemo(()=>{
    return notes.filter(n=>!n.trashed).slice(0,4);
  },[notes]);

  const draftNotes=useMemo(()=>{
    return notes.filter(n=>!n.trashed&&(n.tags?.includes("draft")||n.excerpt?.toLowerCase().includes("draft")||(n as any).status==="review"));
  },[notes]);

  const [activeTab,setActiveTab]=useState<"recent"|"drafts"|"favorites"|"folders">("recent");

  const formatShortDate=(timeStr?:string)=>{
    if(!timeStr)return "";
    if(timeStr==="Today"||timeStr==="Yesterday")return timeStr;
    try{
      const d=new Date(timeStr);
      if(isNaN(d.getTime()))return timeStr;
      const now=new Date();
      const diffDays=Math.floor((now.getTime()-d.getTime())/(1000*60*60*24));
      if(diffDays===0)return "Today";
      if(diffDays===1)return "Yesterday";
      if(diffDays>0&&diffDays<7)return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    }catch{
      return timeStr;
    }
  };

  const cleanExcerpt=(excerpt?:string,noteTitle?:string):string=>{
    if(!excerpt)return "";
    let text=excerpt
      .replace(/^---[\s\S]*?---/g,"")
      .replace(/^tags:\s*\[.*?\]/g,"")
      .replace(/^tags:\s*.*$/gm,"")
      .replace(/^title:\s*.*$/gm,"")
      .replace(/^#+\s*.*$/gm,"")
      .trim();
    if(noteTitle&&text.toLowerCase().startsWith(noteTitle.toLowerCase())){
      text=text.slice(noteTitle.length).replace(/^[\s:—–\-#]+/,"").trim();
    }
    return text;
  };

  return (
    <section className={`obsidian-vault ${drawer?"drawer-open":""}`} onDragOver={e=>e.preventDefault()} onDrop={()=>setDragTarget(null)}>
      <header>
        <button className="icon-button" aria-label={drawer?"Collapse folder sidebar":"Expand folder sidebar"} aria-expanded={drawer} suppressHydrationWarning title={drawer?"Collapse folders":"Expand folders"} onClick={()=>setDrawer(value=>{const next=!value;localStorage.setItem("noema-vault-drawer",next?"open":"closed");return next})}><SidebarSimple/></button>
        <select aria-label="Vault source" value={sourceId} onChange={event=>{setFolder("");setSourceId(event.target.value);void load(event.target.value)}}>{sources.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <label className="vault-organizer-search"><MagnifyingGlass/><span className="sr-only">Search vault</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search content, tags, equations..."/></label>
        <div className="vault-organizer-actions">
          <button className={`secondary ${showGraph?"active":""}`} onClick={()=>setShowGraph(!showGraph)}><ShareNetwork/>Graph</button>
          <button className="secondary" disabled={Boolean(busy||!sourceId)} suppressHydrationWarning onClick={sync}><ArrowClockwise/>{busy?"Syncing…":"Sync"}</button>
          <button className="secondary icon-button" aria-label="New folder" title="New folder" disabled={Boolean(!sourceId||folder.startsWith("@"))} suppressHydrationWarning onClick={()=>void createFolder()}><FolderPlus/></button>
          <button className="primary icon-button" aria-label="New note" title="New note" disabled={Boolean(!sourceId||folder.startsWith("@"))} suppressHydrationWarning onClick={()=>void create()}><FilePlus/></button>
        </div>
      </header>
      {error&&<div className="tutor-error" role="alert">{error}</div>}
      {initialLoading?<div className="vault-loading" role="status" aria-live="polite"><span/><span/><span/><p>Loading vault…</p></div>:!sources.length?<div className="empty-state"><Folder/><h3>Connect your Obsidian vault</h3><p>Add its local path in Settings, then return here to browse the exact folder structure.</p><Link className="primary" href="/settings">Open Settings</Link></div>:(
        <div className="obsidian-vault-body">
          <aside className="obsidian-tree" aria-label="Vault folders">
            <div className="vault-derived-views">{views.map(view=><button className={folder===view.id?"active":""} onClick={()=>{setShowGraph(false);setFolder(view.id);if(view.id==="@favorites")setActiveTab("favorites")}} key={view.id}><view.icon/><span>{view.label}</span></button>)}</div>
            <button className={`${!folder&&!showGraph?"active":""} ${dragTarget===""?"drag-over":""}`} onDragOver={e=>handleDragOver(e,"")} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,"")} onClick={()=>{setShowGraph(false);setFolder("");setActiveTab("recent")}}><FolderOpen/><span>{source?.name}</span></button>
            {tree?.folders.map(item=><TreeFolder node={item} current={showGraph?"":folder} onSelect={path=>{setShowGraph(false);setFolder(path)}} onOpenNote={id=>onOpen(noteMap.get(id))} dragTarget={dragTarget} dragItem={dragItem} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} key={item.path}/>)}
          </aside>
          <main>
            {showGraph?<KnowledgeGraphView onOpenNote={id=>{const found=notes.find(item=>item.id===id||item.title===id);if(found)onOpen(found)}}/>:(
              <>
                <nav className="vault-breadcrumbs" aria-label="Breadcrumb">
                  <button className={dragTarget===""?"drag-over":""} onDragOver={e=>handleDragOver(e,"")} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,"")} onClick={()=>{setFolder("");setActiveTab("recent")}}>{source?.name}</button>
                  {!folder.startsWith("@")&&folder.split("/").filter(Boolean).map((part,index)=>{
                    const parentPath=folder.split("/").slice(0,index+1).join("/");
                    return (
                      <span key={`${part}-${index}`}>
                        <CaretRight/>
                        <button className={dragTarget===parentPath?"drag-over":""} onDragOver={e=>handleDragOver(e,parentPath)} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,parentPath)} onClick={()=>setFolder(parentPath)}>{part}</button>
                      </span>
                    );
                  })}
                </nav>

                <div className="vault-folder-heading">
                  <div>
                    <h2>{isVaultNameHeading?"Knowledge Vault":title}</h2>
                    <p>
                      {folderCount===1?"1 folder":`${folderCount} folders`} · {noteCount===1?"1 note":`${noteCount} notes`}
                      {draftNotes.length>0?` · ${draftNotes.length===1?"1 draft":`${draftNotes.length} drafts`} ready to review`:""}
                    </p>
                  </div>
                </div>

                {showSubnavTabs&&(
                  <div className="vault-subnav-tabs" role="tablist" aria-label="Vault quick views">
                    <button role="tab" aria-selected={activeTab==="recent"&&!folder} className={activeTab==="recent"&&!folder?"active":""} onClick={()=>{setFolder("");setActiveTab("recent")}}>Recent</button>
                    <button role="tab" aria-selected={activeTab==="folders"&&!folder} className={activeTab==="folders"&&!folder?"active":""} onClick={()=>{setFolder("");setActiveTab("folders")}}>Folders</button>
                    <button role="tab" aria-selected={folder==="@favorites"||activeTab==="favorites"} className={folder==="@favorites"||activeTab==="favorites"?"active":""} onClick={()=>{setFolder("@favorites");setActiveTab("favorites")}}>Favorites</button>
                    <button role="tab" aria-selected={activeTab==="drafts"&&!folder} className={activeTab==="drafts"&&!folder?"active":""} onClick={()=>{setFolder("");setActiveTab("drafts")}}>Drafts {draftNotes.length>0&&<span className="tab-count">{draftNotes.length}</span>}</button>
                  </div>
                )}

                {isRootView&&(activeTab==="recent"||activeTab==="drafts")&&draftNotes.length>0&&(
                  <section className="vault-home-section">
                    <div className="vault-section-title">
                      <h3>Drafts & AI Captures</h3>
                      <span className="vault-section-badge warning">Review</span>
                    </div>
                    <div className="vault-recent-grid">
                      {draftNotes.map(n=>(
                        <button className="vault-recent-card draft-card" onClick={()=>onOpen(n)} key={n.id}>
                          <div className="recent-card-head">
                            <FileText/>
                            <strong>{n.title}</strong>
                          </div>
                          {cleanExcerpt(n.excerpt,n.title)&&<p>{cleanExcerpt(n.excerpt,n.title)}</p>}
                          <div className="recent-card-meta">
                            <span className="draft-pill">Draft · Ready to optimize</span>
                            {n.time&&<time>{formatShortDate(n.time)}</time>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {isRootView&&activeTab==="recent"&&recentNotes.length>0&&(
                  <section className="vault-home-section">
                    <div className="vault-section-title">
                      <h3>Recent Activity</h3>
                    </div>
                    <div className="vault-recent-grid">
                      {recentNotes.map(n=>(
                        <button className="vault-recent-card" onClick={()=>onOpen(n)} key={n.id}>
                          <div className="recent-card-head">
                            <FileText/>
                            <strong>{n.title}</strong>
                          </div>
                          {cleanExcerpt(n.excerpt,n.title)&&<p>{cleanExcerpt(n.excerpt,n.title)}</p>}
                          <div className="recent-card-meta">
                            <span>{n.tags?.slice(0,2).map(t=><span className="recent-tag" key={t}>#{t} </span>)}</span>
                            {n.time&&<time>Updated {formatShortDate(n.time)}</time>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {(activeTab==="folders"||!isRootView||activeTab==="favorites"||folder==="@favorites")&&(
                  <>
                    {isRootView&&activeTab==="folders"&&<div className="vault-section-title"><h3>Folders & Files</h3></div>}
                    <div className="vault-folder-grid">
                      {current?.folders.map(item=>{
                        const count=item.folders.length+item.notes.length;
                        return (
                          <button
                            className={`vault-folder-card ${dragTarget===item.path?"drag-over":""} ${dragItem?.path===item.path?"dragging":""}`}
                            draggable={!folder.startsWith("@")}
                            onDragStart={e=>handleDragStart(e,{type:"folder",path:item.path,name:item.name})}
                            onDragOver={e=>handleDragOver(e,item.path)}
                            onDragLeave={handleDragLeave}
                            onDrop={e=>handleDrop(e,item.path)}
                            onClick={()=>setFolder(item.path)}
                            key={item.path}
                          >
                            <Folder/>
                            <span><strong>{item.name}</strong><small>{count===1?"1 item":`${count} items`}</small></span>
                            <CaretRight className="folder-chevron"/>
                          </button>
                        );
                      })}
                      {visible.map(item=>{
                        const note=noteMap.get(item.noteId);
                        const isDraggingThis=dragItem?.path===item.path;
                        return (
                          <article className={`vault-file-card ${isDraggingThis?"dragging":""}`} draggable={!folder.startsWith("@")} onDragStart={e=>handleDragStart(e,{type:"note",path:item.path,name:item.name,noteId:item.noteId})} key={item.noteId}>
                            <button onClick={()=>note&&onOpen(note)}><FileText/><span><strong>{item.name.replace(/\.md$/i,"")}</strong><small>{item.path}</small></span></button>
                            <span className={`sync-dot ${item.syncState}`} title={item.syncState}/>
                            <button aria-label={`Draw in ${item.name}`} disabled={Boolean(!note?.sourceId)} suppressHydrationWarning onClick={()=>note&&onOpen(note)}><PencilSimple/></button>
                            {!folder.startsWith("@")&&<><button aria-label={`Move ${item.name}`} onClick={()=>move(item)}><Folder/></button><button aria-label={`Trash ${item.name}`} onClick={()=>trash(item)}><Trash/></button></>}
                          </article>
                        );
                      })}
                      {!current?.folders.length&&!visible.length&&<div className="empty-state"><Folder/><h3>No notes here</h3><p>{query?"Try a broader search.":"Create a note or folder here to begin."}</p>{!query&&!folder.startsWith("@")&&<button className="primary" onClick={()=>void create()}>Create note</button>}</div>}
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        </div>
      )}
      {!initialLoading&&sources.length>0&&<div className="vault-mobile-action" style={{display:"none"}}><button className="primary" disabled={Boolean(!sourceId||folder.startsWith("@"))} onClick={()=>void create()}><FilePlus/><span>New note</span></button></div>}
    </section>
  );
}
