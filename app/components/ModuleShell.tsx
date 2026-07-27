"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {ReactNode, useEffect, useState} from "react";
import {
  Bell, BookOpen, CalendarBlank, CheckSquare, Code, Command, FileText, Folder, Gear,
  House, Lightning, ListChecks, MagnifyingGlass, Moon, Plus, Sparkle, Sun, Tray, X
} from "@phosphor-icons/react";
import {ModalDialog} from "./ModalDialog";

type SearchHit={id:string;label:string;detail:string;href:string;Icon:typeof FileText};
type Notification={id:string;title:string;body:string;kind:string;read_at:string|null;created_at:string};
type Recommendation={id:string;proposal:{title:string;priority:string};sources:{title:string}[];provider:string};

const nav = [
  ["Today","/",House],["Capture","/capture",Plus],["Calendar","/calendar",CalendarBlank],
  ["Tasks","/tasks",CheckSquare],["Vault","/vault",Folder],["Projects","/projects",Tray],
  ["Study","/study",BookOpen],["Coding","/coding",Code],["Automations","/automations",Lightning]
] as const;

export function ModuleShell({active,title,action,assistantContext,children}:{active:string;title:string;action?:ReactNode;assistantContext?:{type:string;id:string};children:ReactNode}) {
  const router=useRouter();
  const [theme,setTheme]=useState<"dark"|"light">("dark");
  const [palette,setPalette]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [notificationItems,setNotificationItems]=useState<Notification[]>([]);
  const [notificationError,setNotificationError]=useState("");
  const [assistant,setAssistant]=useState(false);
  const [recommendations,setRecommendations]=useState<Recommendation[]>([]),[assistantError,setAssistantError]=useState("");
  const [resolvedAssistantContext,setResolvedAssistantContext]=useState<{type:string;id:string}|undefined>();assistantContext=assistantContext||resolvedAssistantContext;
  const [query,setQuery]=useState("");
  const [searchResults,setSearchResults]=useState<SearchHit[]>([]);
  const [searching,setSearching]=useState(false);
  const [searchError,setSearchError]=useState("");
  const [semanticSearch,setSemanticSearch]=useState(false),[rankingSource,setRankingSource]=useState("");
  useEffect(()=>{const saved=localStorage.getItem("lifeos-theme") as "dark"|"light"|null;if(saved)setTheme(saved)},[]);
  useEffect(()=>{const area=active.toLowerCase(),allowed=new Set(["today","capture","tasks","calendar","vault","study","projects","coding","automations","settings"]);if(allowed.has(area))void fetch("/api/v1/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"navigation",properties:{area}})}).catch(()=>{})},[active]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("lifeos-theme",theme)},[theme]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setPalette(true)}if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="j"){event.preventDefault();setAssistant(true)}if(event.key==="Escape"){setPalette(false);setNotifications(false);setAssistant(false)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[]);
  useEffect(()=>{if(!notifications)return;setNotificationError("");fetch("/api/v1/notifications").then(async response=>{if(!response.ok)throw new Error(response.status===401?"Sign in to view notifications.":"Notifications are unavailable.");return response.json()}).then(data=>setNotificationItems(data.notifications)).catch(error=>setNotificationError(error.message))},[notifications]);
  useEffect(()=>{if(!assistant)return;void (async()=>{try{let context=assistantContext;if(!context&&active==="Projects"){const data=await (await fetch("/api/v1/projects")).json(),project=data.projects?.find((item:{id:string;name:string})=>item.name===title);if(project){context={type:"project",id:project.id};setResolvedAssistantContext(context)}}if(!context)return;const response=await fetch(`/api/v1/recommendations?contextType=${context.type}&contextId=${context.id}&generate=true`),data=await response.json();if(!response.ok)throw new Error(data.error?.message);setRecommendations(data.recommendations)}catch(error){setAssistantError((error as Error).message)}})()},[assistant,assistantContext?.type,assistantContext?.id,active,title]);
  useEffect(()=>{
    const term=query.trim();
    if(term.length<2){setSearchResults([]);setSearching(false);setSearchError("");return}
    const controller=new AbortController(),timer=setTimeout(async()=>{setSearching(true);setSearchError("");try{const response=await fetch(`/api/v1/search?q=${encodeURIComponent(term)}&semantic=${semanticSearch}`,{signal:controller.signal});if(!response.ok)throw new Error(response.status===401?"Sign in to search your workspace.":"Search is unavailable.");const data=await response.json();setRankingSource(data.ranking.mode==="semantic"?`Semantic ranking · ${data.ranking.source} ${data.ranking.model}`:data.ranking.fallback?`Local ranking · ${data.ranking.fallback}`:"Local ranking · SQLite FTS/LIKE");setSearchResults([
      ...data.notes.map((item:{id:string;title:string})=>({id:`note-${item.id}`,label:item.title,detail:"Note",href:`/vault?open=${item.id}`,Icon:FileText})),
      ...data.tasks.map((item:{id:string;title:string;project:string})=>({id:`task-${item.id}`,label:item.title,detail:`Task · ${item.project}`,href:`/tasks?open=${item.id}`,Icon:CheckSquare})),
      ...data.events.map((item:{id:string;title:string;time:string})=>({id:`event-${item.id}`,label:item.title,detail:`Event · ${item.time}`,href:`/calendar?open=${item.id}`,Icon:CalendarBlank})),
      ...data.projects.map((item:{id:string;name:string})=>({id:`project-${item.id}`,label:item.name,detail:"Project",href:`/projects?open=${item.id}`,Icon:Tray})),
      ...data.captures.map((item:{id:string;text:string})=>({id:`capture-${item.id}`,label:item.text,detail:"Capture",href:`/capture?open=${item.id}`,Icon:Plus})),
    ])}catch(error){if((error as Error).name!=="AbortError"){setSearchResults([]);setSearchError((error as Error).message)}}finally{setSearching(false)}},semanticSearch?700:250);
    return()=>{clearTimeout(timer);controller.abort()};
  },[query,semanticSearch]);
  const navigationResults=[...nav.map(([label,href,Icon])=>({id:`nav-${href}`,label,detail:"Open module",href,Icon})),{id:"nav-compiler",label:"Compiler",detail:"Compile and run code safely",href:"/coding/compiler",Icon:Code},{id:"nav-canvas",label:"Canvas",detail:"Arrange connected material",href:"/canvas",Icon:FileText},{id:"nav-activity",label:"Activity and undo",detail:"Review changes",href:"/activity",Icon:FileText},{id:"nav-help",label:"Help and shortcuts",detail:"Learn LifeOS",href:"/help",Icon:Command},{id:"nav-settings",label:"Settings",detail:"Preferences and security",href:"/settings",Icon:Gear}].filter(item=>`${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  const results=query.trim().length<2?navigationResults:searchResults;
  function go(href:string){setPalette(false);setQuery("");if(href.includes("?open="))location.assign(href);else router.push(href)}
  async function markRead(item:Notification){if(item.read_at)return;const response=await fetch(`/api/v1/notifications/${item.id}/read`,{method:"POST"});if(response.ok)setNotificationItems(current=>current.map(value=>value.id===item.id?{...value,read_at:new Date().toISOString()}:value))}
  async function decide(item:Recommendation,disposition:"accepted"|"rejected"){const response=await fetch(`/api/v1/recommendations/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({disposition})});if(response.ok)setRecommendations(current=>current.filter(value=>value.id!==item.id));else setAssistantError((await response.json()).error?.message||"Recommendation failed")}
  return <div className="module-shell">
    <a className="skip" href="#module-main">Skip to main content</a>
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/"><span className="brand-mark"/>LifeOS</Link>
      <nav>{nav.map(([label,href,Icon])=><Link className={label===active?"active":""} href={href} key={label}><Icon/><span>{label}</span></Link>)}</nav>
      <Link className="settings" href="/settings"><Gear/><span>Settings</span></Link>
    </aside>
    <header className="module-topbar"><h1>{title}</h1><div className="top-actions"><button className="search" onClick={()=>setPalette(true)}><MagnifyingGlass/><span>Search</span><kbd>⌘ K</kbd></button><button className="icon-button" aria-label="Open contextual assistant" onClick={()=>setAssistant(true)}><Sparkle/></button><button className="icon-button" aria-label={`Use ${theme==="dark"?"light":"dark"} theme`} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun/>:<Moon/>}</button><button className={`icon-button ${notificationItems.some(item=>!item.read_at)?"unread":""}`} aria-label="Notifications" aria-expanded={notifications} onClick={()=>setNotifications(!notifications)}><Bell/></button>{action}</div>{notifications&&<aside className="notification-popover"><header><strong>Notifications</strong><button className="icon-button" aria-label="Close notifications" onClick={()=>setNotifications(false)}><X/></button></header>{notificationError?<p role="alert">{notificationError}</p>:notificationItems.length?notificationItems.slice(0,8).map(item=><button className={item.read_at?"":"unread-item"} key={item.id} onClick={()=>markRead(item)}><strong>{item.title}</strong><small>{item.body||item.kind} · {new Date(item.created_at).toLocaleString()}</small></button>):<p>No notifications.</p>}<Link href="/activity">View activity</Link></aside>}</header>
    <main id="module-main" className="module-main">{children}</main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{([["Today","/",House],["Capture","/capture",Plus],["Tasks","/tasks",ListChecks],["Vault","/vault",Folder],["More","/settings",Command]] as const).map(([label,href,Icon],i)=><Link className={`${label===active?"active":""} ${i===1?"capture-nav":""}`} href={href} key={label}><Icon/><span>{label}</span></Link>)}</nav>
    {palette&&<ModalDialog className="palette-dialog" onClose={()=>setPalette(false)}><div className="palette-search"><MagnifyingGlass/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} aria-label="Search workspace" placeholder="Search notes, tasks, events, captures…"/><button className="icon-button" aria-label="Close search" onClick={()=>setPalette(false)}><X/></button></div><label className="semantic-search-toggle"><input type="checkbox" checked={semanticSearch} onChange={event=>setSemanticSearch(event.target.checked)}/><span>Semantic ranking</span><small>Sends result titles and excerpts to the configured OpenAI embedding model</small></label><p aria-live="polite">{searching?"Searching…":searchError||`${results.length} results${rankingSource?` · ${rankingSource}`:""}`}</p>{results.map(({id,label,detail,href,Icon})=><button key={id} onClick={()=>go(href)}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><kbd>↵</kbd></button>)}{!searching&&!searchError&&!results.length&&<div className="palette-empty">No workspace results match “{query}”.</div>}</ModalDialog>}
    {assistant&&<aside className="ai-panel" aria-label="Contextual assistant"><header><span><Sparkle/><strong>Plan with LifeOS</strong></span><button className="icon-button" aria-label="Close assistant" onClick={()=>setAssistant(false)}><X/></button></header>{assistantError&&<p role="alert">{assistantError}</p>}{!assistantContext?<p>Open a project to receive grounded recommendations.</p>:recommendations.length?<ol>{recommendations.map(item=><li key={item.id}><CheckSquare/><span><strong>{item.proposal.title}</strong><small>{item.proposal.priority} · {item.sources.map(source=>source.title).join(", ")} · {item.provider}</small><button className="secondary" onClick={()=>void decide(item,"rejected")}>Reject</button><button className="primary" onClick={()=>void decide(item,"accepted")}>Create task</button></span></li>)}</ol>:<p>No pending recommendations.</p>}<small>Suggestions are persisted drafts. Nothing changes without confirmation.</small></aside>}
  </div>;
}
