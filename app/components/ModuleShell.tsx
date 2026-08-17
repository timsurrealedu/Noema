"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {ReactNode, useEffect, useState} from "react";
import {
  Bell, BookOpen, CalendarBlank, CheckSquare, Code, Command, FileText, Folder, Gear,
  House, Lightning, ListChecks, MagnifyingGlass, Moon, Plus, ShareNetwork, Sparkle, Sun, Tray, X
} from "@phosphor-icons/react";
import {ModalDialog} from "./ModalDialog";
import {NoemaLogo} from "./NoemaLogo";

import { ContextualAssistant } from "./ContextualAssistant";

type SearchHit={id:string;label:string;detail:string;href:string;Icon:typeof FileText};
type Notification={id:string;title:string;body:string;kind:string;read_at:string|null;created_at:string};

const nav = [
  ["Home","/",House],["Capture","/capture",Plus],["Calendar","/calendar",CalendarBlank],
  ["Vault","/vault",Folder],["Coding","/coding",Code]
] as const;

export function ModuleShell({active,title,action,assistantContext,children}:{active:string;title:string;action?:ReactNode;assistantContext?:{type:string;id:string};children:ReactNode}) {
  const router=useRouter();
  const [theme,setTheme]=useState<"dark"|"light">("dark");
  const [palette,setPalette]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [notificationItems,setNotificationItems]=useState<Notification[]>([]);
  const [notificationError,setNotificationError]=useState("");
  const [assistant,setAssistant]=useState(false);
  const [query,setQuery]=useState("");
  const [searchResults,setSearchResults]=useState<SearchHit[]>([]);
  const [searching,setSearching]=useState(false);
  const [searchError,setSearchError]=useState("");
  const [semanticSearch,setSemanticSearch]=useState(false),[rankingSource,setRankingSource]=useState("");
  useEffect(()=>{const saved=localStorage.getItem("noema-theme") as "dark"|"light"|null;if(saved)setTheme(saved)},[]);
  useEffect(()=>{const area=active.toLowerCase(),allowed=new Set(["home","today","capture","tasks","calendar","vault","graph","study","projects","coding","automations","dashboards","plugins","collaboration","settings"]);if(allowed.has(area))void fetch("/api/v1/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"navigation",properties:{area}})}).catch(()=>{})},[active]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("noema-theme",theme)},[theme]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setPalette(true)}if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="j"){event.preventDefault();setAssistant(true)}if(event.key==="Escape"){setPalette(false);setNotifications(false);setAssistant(false)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[]);
  useEffect(()=>{if(!notifications)return;setNotificationError("");fetch("/api/v1/notifications").then(async response=>{if(!response.ok)throw new Error(response.status===401?"Sign in to view notifications.":"Notifications are unavailable.");return response.json()}).then(data=>setNotificationItems(data.notifications)).catch(error=>setNotificationError(error.message))},[notifications]);

  useEffect(() => {
    const term=query.trim();
    if(term.length<2){setSearchResults([]);setSearching(false);setSearchError("");return}
    const controller=new AbortController(),timer=setTimeout(async()=>{setSearching(true);setSearchError("");try{const response=await fetch(`/api/v1/search?q=${encodeURIComponent(term)}&semantic=${semanticSearch}`,{signal:controller.signal});if(!response.ok)throw new Error(response.status===401?"Sign in to search your workspace.":"Search is unavailable.");const data=await response.json();setRankingSource(data.ranking.mode==="semantic"?`Semantic ranking · ${data.ranking.source} ${data.ranking.model}`:data.ranking.fallback?`Local ranking · ${data.ranking.fallback}`:"Local ranking · SQLite FTS/LIKE");setSearchResults([
      ...data.notes.map((item:{id:string;title:string})=>({id:`note-${item.id}`,label:item.title,detail:"Note",href:`/vault?open=${item.id}`,Icon:FileText})),
      ...data.tasks.map((item:{id:string;title:string;project:string})=>({id:`task-${item.id}`,label:item.title,detail:`Task · ${item.project}`,href:`/?open=${item.id}`,Icon:CheckSquare})),
      ...data.events.map((item:{id:string;title:string;time:string})=>({id:`event-${item.id}`,label:item.title,detail:`Event · ${item.time}`,href:`/calendar?open=${item.id}`,Icon:CalendarBlank})),
      ...data.projects.map((item:{id:string;name:string})=>({id:`project-${item.id}`,label:item.name,detail:"Project",href:`/projects?open=${item.id}`,Icon:Tray})),
      ...data.captures.map((item:{id:string;text:string})=>({id:`capture-${item.id}`,label:item.text,detail:"Capture",href:`/capture?open=${item.id}`,Icon:Plus})),
    ])}catch(error){if((error as Error).name!=="AbortError"){setSearchResults([]);setSearchError((error as Error).message)}}finally{setSearching(false)}},semanticSearch?700:250);
    return()=>{clearTimeout(timer);controller.abort()};
  },[query,semanticSearch]);
  const navigationResults=[...nav.map(([label,href,Icon])=>({id:`nav-${href}`,label,detail:"Open module",href,Icon})),{id:"nav-compiler",label:"Compiler",detail:"Compile and run code safely",href:"/coding/compiler",Icon:Code},{id:"nav-canvas",label:"Canvas",detail:"Arrange connected material",href:"/canvas",Icon:FileText},{id:"nav-activity",label:"Activity and undo",detail:"Review changes",href:"/activity",Icon:FileText},{id:"nav-help",label:"Help and shortcuts",detail:"Learn Noema",href:"/help",Icon:Command},{id:"nav-settings",label:"Settings",detail:"Preferences and security",href:"/settings",Icon:Gear}].filter(item=>`${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  const results=query.trim().length<2?navigationResults:searchResults;
  function go(href:string){setPalette(false);setQuery("");router.push(href)}
  async function markRead(item:Notification){if(item.read_at)return;const response=await fetch(`/api/v1/notifications/${item.id}/read`,{method:"POST"});if(response.ok)setNotificationItems(current=>current.map(value=>value.id===item.id?{...value,read_at:new Date().toISOString()}:value))}

  return <div className="module-shell">
    <a className="skip" href="#module-main">Skip to main content</a>
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/"><NoemaLogo /><span>Noema</span></Link>
      <nav>{nav.map(([label,href,Icon])=><Link className={label===active?"active":""} href={href} key={label}><Icon/><span>{label}</span></Link>)}</nav>
      <Link className="settings" href="/settings"><Gear/><span>Settings</span></Link>
    </aside>
    <header className="module-topbar"><h1>{title}</h1><div className="top-actions"><button className="search" aria-label="Search workspace" onClick={()=>setPalette(true)}><MagnifyingGlass/><span>Search</span><kbd>⌘ K</kbd></button><button className="icon-button" aria-label="Open contextual assistant" onClick={()=>setAssistant(true)}><Sparkle/></button><button className="icon-button" aria-label={`Use ${theme==="dark"?"light":"dark"} theme`} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun/>:<Moon/>}</button><button className={`icon-button ${notificationItems.some(item=>!item.read_at)?"unread":""}`} aria-label="Notifications" aria-expanded={notifications} onClick={()=>setNotifications(!notifications)}><Bell/></button>{action}</div></header>
    <main id="module-main" className="module-main">{children}</main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{([["Home","/",House],["Capture","/capture",Tray],["Vault","/vault",Folder],["Calendar","/calendar",CalendarBlank],["Coding","/coding",Code]] as const).map(([label,href,Icon])=><Link className={label===active?"active":""} href={href} key={label}><Icon/><span>{label}</span></Link>)}</nav>
    {notifications&&<ModalDialog className="notification-dialog" ariaLabel="Notifications" onClose={()=>setNotifications(false)}><header><strong>Notifications</strong><button className="icon-button" aria-label="Close notifications" onClick={()=>setNotifications(false)}><X/></button></header><div className="notification-list">{notificationError?<p role="alert">{notificationError}</p>:notificationItems.length?notificationItems.slice(0,8).map(item=><button className={item.read_at?"":"unread-item"} key={item.id} onClick={()=>markRead(item)}><strong>{item.title}</strong><small>{item.body||item.kind} · {new Date(item.created_at).toLocaleString()}</small></button>):<p>No notifications yet.</p>}</div><footer><Link className="secondary" href="/activity" onClick={()=>setNotifications(false)}>View activity</Link></footer></ModalDialog>}
    {palette&&<ModalDialog className="palette-dialog" onClose={()=>setPalette(false)}><div className="palette-search"><MagnifyingGlass/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} aria-label="Search workspace" placeholder="Search notes, tasks, events, captures…"/><button className="icon-button" aria-label="Close search" onClick={()=>setPalette(false)}><X/></button></div><label className="semantic-search-toggle"><input type="checkbox" checked={semanticSearch} onChange={event=>setSemanticSearch(event.target.checked)}/><span>Semantic ranking</span><small>Sends result titles and excerpts to the configured OpenAI embedding model</small></label><p aria-live="polite">{searching?"Searching…":searchError||`${results.length} results${rankingSource?` · ${rankingSource}`:""}`}</p>{results.map(({id,label,detail,href,Icon})=><button key={id} onClick={()=>go(href)}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><kbd>↵</kbd></button>)}{!searching&&!searchError&&!results.length&&<div className="palette-empty">No workspace results match “{query}”.</div>}</ModalDialog>}
    <ContextualAssistant
      isOpen={assistant}
      onClose={() => setAssistant(false)}
      assistantContext={assistantContext}
      active={active}
      title={title}
    />
  </div>;
}
