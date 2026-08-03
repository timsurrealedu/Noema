"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowClockwise,CaretDown,CaretRight,FilePlus,FileText,Folder,FolderOpen,FolderPlus,House,MagnifyingGlass,PencilSimple,ShareNetwork,SidebarSimple,Star,Tag,Trash} from "@phosphor-icons/react";
import type {Note} from "./AppState";
import {KnowledgeGraphView} from "./KnowledgeGraphView";

type VaultSource={id:string;name:string;state:string;last_sync_at?:string;lastResult?:{conflicts?:number}};
type TreeNote={name:string;path:string;noteId:string;syncState:string};
type Tree={name:string;path:string;folders:Tree[];notes:TreeNote[]};
type DragPayload={type:"note"|"folder";path:string;name:string;noteId?:string};

const request=async(path:string,options?:RequestInit)=>{const response=await fetch(path,options),data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Vault request failed");return data};

function TreeFolder({node,current,onSelect,dragTarget,dragItem,onDragStart,onDragOver,onDragLeave,onDrop}:{node:Tree;current:string;onSelect:(path:string)=>void;dragTarget:string|null;dragItem:DragPayload|null;onDragStart:(e:React.DragEvent,item:DragPayload)=>void;onDragOver:(e:React.DragEvent,path:string)=>void;onDragLeave:(e:React.DragEvent)=>void;onDrop:(e:React.DragEvent,targetPath:string)=>void}){
  const [open,setOpen]=useState(true);
  const isDropTarget=dragTarget===node.path;
  const isDraggingSelf=dragItem?.path===node.path;
  return (
    <div className="vault-tree-folder">
      <button
        className={`${current===node.path?"active":""} ${isDropTarget?"drag-over":""} ${isDraggingSelf?"dragging":""}`}
        draggable
        onDragStart={e=>onDragStart(e,{type:"folder",path:node.path,name:node.name})}
        onDragOver={e=>onDragOver(e,node.path)}
        onDragLeave={onDragLeave}
        onDrop={e=>onDrop(e,node.path)}
        onClick={()=>{setOpen(true);onSelect(node.path)}}
      >
        {open?<CaretDown/>:<CaretRight/>}
        {open?<FolderOpen/>:<Folder/>}
        <span>{node.name}</span>
        <small>{node.notes.length+node.folders.length}</small>
      </button>
      {open&&<div>{node.folders.map(folder=><TreeFolder node={folder} current={current} onSelect={onSelect} dragTarget={dragTarget} dragItem={dragItem} onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} key={folder.path}/>)}</div>}
    </div>
  );
}

function findFolder(root:Tree,path:string):Tree{if(!path)return root;for(const folder of root.folders){if(folder.path===path)return folder;if(path.startsWith(`${folder.path}/`))return findFolder(folder,path)}return root}

export function VaultOrganizer({notes,onOpen}:{notes:Note[];onOpen:(note:Note)=>void}){
  const [sources,setSources]=useState<VaultSource[]>([]),[sourceId,setSourceId]=useState(""),[tree,setTree]=useState<Tree|null>(null),[folder,setFolder]=useState(""),[query,setQuery]=useState(""),[drawer,setDrawer]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[showGraph,setShowGraph]=useState(false),startedInk=useRef(false);
  const [dragItem,setDragItem]=useState<DragPayload|null>(null);
  const [dragTarget,setDragTarget]=useState<string|null>(null);
  const noteMap=useMemo(()=>({get:(id:string)=>notes.find(note=>note.id===id)||({id,title:"Note",excerpt:"",tags:[],time:"",ai:false} as unknown as Note)}),[notes]);

  async function load(preferred=sourceId){try{const data=await request(`/api/v1/vault-sources?tree=true${preferred?`&sourceId=${encodeURIComponent(preferred)}`:""}`);setSources(data.sources);setSourceId(data.selectedSourceId);setTree(data.tree);if(new URLSearchParams(location.search).get("new")==="ink"&&data.selectedSourceId&&!startedInk.current){startedInk.current=true;void create(`Handwritten note ${new Date().toISOString().slice(0,16).replace(/[T:]/g,"-")}`,data.selectedSourceId,true)}}catch(reason){setError((reason as Error).message)}}
  useEffect(()=>{setDrawer(matchMedia("(max-width: 900px)").matches?false:localStorage.getItem("noema-vault-drawer")!=="closed");void load()},[]);

  async function sync(){if(!sourceId)return;setBusy(true);try{await request(`/api/v1/vault-sources/${sourceId}/sync`,{method:"POST"});await load(sourceId)}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}}

  async function create(givenName?:string,selected=sourceId,ink=false){if(!selected)return;const name=givenName||prompt("Note name");if(!name)return;const file=`${name.replace(/\.md$/i,"").replace(/[\\/:*?\"<>|]/g,"-").trim()}.md`,relativePath=folder&&!folder.startsWith("@")?`${folder}/${file}`:file;try{const created=await request(`/api/v1/vault-sources/${selected}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath})});await load(selected);location.assign(`/vault?open=${created.noteId}${ink?"&ink=1":""}`)}catch(reason){setError((reason as Error).message)}}

  async function createFolder(){if(!sourceId)return;const name=prompt("Folder name");if(!name)return;const cleanName=name.replace(/[\\/:*?\"<>|]/g,"-").trim();if(!cleanName)return;const folderPath=folder&&!folder.startsWith("@")?`${folder}/${cleanName}`:cleanName;const relativePath=`${folderPath}/Untitled note.md`;setBusy(true);try{const created=await request(`/api/v1/vault-sources/${sourceId}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath})});setFolder(folderPath);await load(sourceId);if(created.noteId)location.assign(`/vault?open=${created.noteId}`)}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}}

  async function move(item:TreeNote){const to=prompt("Move or rename note",item.path);if(!to||to===item.path)return;try{const preview=await request(`/api/v1/vault-sources/${sourceId}/entries/move`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:item.path,to,preview:true})});if(preview.backlinks.length&&!confirm(`Update links in ${preview.backlinks.length} note(s)?`))return;await request(`/api/v1/vault-sources/${sourceId}/entries/move`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:item.path,to})});await load(sourceId)}catch(reason){setError((reason as Error).message)}}

  async function trash(item:TreeNote){if(!confirm(`Move ${item.path} to recoverable Obsidian trash?`))return;try{await request(`/api/v1/vault-sources/${sourceId}/entries/trash`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath:item.path})});await load(sourceId)}catch(reason){setError((reason as Error).message)}}

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
        if(preview.backlinks.length&&!confirm(`Update links in ${preview.backlinks.length} note(s)?`))return;
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

  const current=tree&&!folder.startsWith("@")?findFolder(tree,folder):null,source=sources.find(item=>item.id===sourceId),views:{id:string;label:string;icon:typeof House}[]=[{id:"@all",label:"All notes",icon:House},{id:"@favorites",label:"Favorites",icon:Star},{id:"@tags",label:"Tags",icon:Tag},{id:"@local",label:"Local",icon:FileText},{id:"@trash",label:"Trash",icon:Trash}],specialNotes=folder==="@all"?notes.filter(note=>!note.trashed):folder==="@favorites"?notes.filter(note=>note.favorite&&!note.trashed):folder==="@tags"?notes.filter(note=>note.tags.length&&!note.trashed):folder==="@local"?notes.filter(note=>!note.sourceId&&!note.trashed):folder==="@trash"?notes.filter(note=>note.trashed):[],visible=(folder.startsWith("@")?specialNotes.map(note=>({name:`${note.title}.md`,path:note.relativePath||"Local",noteId:note.id,syncState:note.syncState||"local"})):current?.notes||[]).filter(item=>`${item.name} ${item.path}`.toLowerCase().includes(query.toLowerCase())),title=views.find(view=>view.id===folder)?.label||folder.split("/").at(-1)||source?.name;

  return (
    <section className={`obsidian-vault ${drawer?"drawer-open":""}`} onDragOver={e=>e.preventDefault()} onDrop={()=>setDragTarget(null)}>
      <header>
        <button className="icon-button" aria-label={drawer?"Collapse folder sidebar":"Expand folder sidebar"} aria-expanded={drawer} suppressHydrationWarning title={drawer?"Collapse folders":"Expand folders"} onClick={()=>setDrawer(value=>{const next=!value;localStorage.setItem("noema-vault-drawer",next?"open":"closed");return next})}><SidebarSimple/></button>
        <select aria-label="Vault source" value={sourceId} onChange={event=>{setFolder("");setSourceId(event.target.value);void load(event.target.value)}}>{sources.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <label className="vault-organizer-search"><MagnifyingGlass/><span className="sr-only">Search vault</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search vault"/></label>
        <span className={`vault-connection ${source?.state}`}>{source?.state||"No vault connected"}</span>
        <button className={`secondary ${showGraph?"active":""}`} onClick={()=>setShowGraph(!showGraph)}><ShareNetwork/>Graph</button>
        <button className="secondary" disabled={Boolean(busy||!sourceId)} suppressHydrationWarning onClick={sync}><ArrowClockwise/>{busy?"Syncing…":"Sync"}</button>
        <button className="secondary icon-button" aria-label="New folder" title="New folder" disabled={Boolean(!sourceId||folder.startsWith("@"))} suppressHydrationWarning onClick={()=>void createFolder()}><FolderPlus/></button>
        <button className="primary icon-button" aria-label="New note" title="New note" disabled={Boolean(!sourceId||folder.startsWith("@"))} suppressHydrationWarning onClick={()=>void create()}><FilePlus/></button>
      </header>
      {error&&<div className="tutor-error" role="alert">{error}</div>}
      {!sources.length?<div className="empty-state"><Folder/><h3>Connect your Obsidian vault</h3><p>Add its local path in Settings, then return here to browse the exact folder structure.</p><Link className="primary" href="/settings">Open Settings</Link></div>:(
        <div className="obsidian-vault-body">
          <aside className="obsidian-tree" aria-label="Vault folders">
            <div className="vault-derived-views">{views.map(view=><button className={folder===view.id?"active":""} onClick={()=>{setShowGraph(false);setFolder(view.id)}} key={view.id}><view.icon/><span>{view.label}</span></button>)}</div>
            <button className={`${!folder&&!showGraph?"active":""} ${dragTarget===""?"drag-over":""}`} onDragOver={e=>handleDragOver(e,"")} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,"")} onClick={()=>{setShowGraph(false);setFolder("")}}><FolderOpen/><span>{source?.name}</span></button>
            {tree?.folders.map(item=><TreeFolder node={item} current={showGraph?"":folder} onSelect={path=>{setShowGraph(false);setFolder(path)}} dragTarget={dragTarget} dragItem={dragItem} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} key={item.path}/>)}
          </aside>
          <main>
            {showGraph?<KnowledgeGraphView onOpenNote={id=>{const found=notes.find(item=>item.id===id||item.title===id);if(found)onOpen(found)}}/>:(
              <>
                <nav className="vault-breadcrumbs" aria-label="Breadcrumb">
                  <button className={dragTarget===""?"drag-over":""} onDragOver={e=>handleDragOver(e,"")} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,"")} onClick={()=>setFolder("")}>{source?.name}</button>
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
                    <h2>{title}</h2>
                    <p>{current?.folders.length||0} folders · {visible.length} notes</p>
                  </div>
                </div>
                <div className="vault-folder-grid">
                  {current?.folders.map(item=>(
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
                      <span><strong>{item.name}</strong><small>{item.folders.length+item.notes.length} items</small></span>
                      <CaretRight/>
                    </button>
                  ))}
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
                  {!current?.folders.length&&!visible.length&&<div className="empty-state"><Folder/><h3>No notes here</h3><p>{query?"Try a broader search.":"Create a note or folder here to begin."}</p></div>}
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </section>
  );
}

