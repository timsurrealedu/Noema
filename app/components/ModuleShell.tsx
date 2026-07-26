"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {ReactNode, useEffect, useState} from "react";
import {
  Bell, BookOpen, CalendarBlank, CheckSquare, Code, Command, FileText, Folder, Gear,
  House, Lightning, ListChecks, MagnifyingGlass, Moon, Plus, Sparkle, Sun, Tray, X
} from "@phosphor-icons/react";
import {ModalDialog} from "./ModalDialog";

const nav = [
  ["Today","/",House],["Capture","/capture",Plus],["Calendar","/calendar",CalendarBlank],
  ["Tasks","/tasks",CheckSquare],["Vault","/vault",Folder],["Projects","/projects",Tray],
  ["Study","/study",BookOpen],["Coding","/coding",Code],["Automations","/automations",Lightning]
] as const;

export function ModuleShell({active,title,action,children}:{active:string;title:string;action?:ReactNode;children:ReactNode}) {
  const router=useRouter();
  const [theme,setTheme]=useState<"dark"|"light">("dark");
  const [palette,setPalette]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [assistant,setAssistant]=useState(false);
  const [query,setQuery]=useState("");
  useEffect(()=>{const saved=localStorage.getItem("lifeos-theme") as "dark"|"light"|null;if(saved)setTheme(saved)},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("lifeos-theme",theme)},[theme]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setPalette(true)}if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="j"){event.preventDefault();setAssistant(true)}if(event.key==="Escape"){setPalette(false);setNotifications(false);setAssistant(false)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[]);
  const results=[...nav.map(([label,href,Icon])=>({label,detail:"Open module",href,Icon})),{label:"Compiler",detail:"Compile and run code safely",href:"/coding/compiler",Icon:Code},{label:"Canvas",detail:"Arrange connected material",href:"/canvas",Icon:FileText},{label:"Activity and undo",detail:"Review changes",href:"/activity",Icon:FileText},{label:"Help and shortcuts",detail:"Learn LifeOS",href:"/help",Icon:Command},{label:"Settings",detail:"Preferences and security",href:"/settings",Icon:Gear}].filter(item=>`${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  function go(href:string){setPalette(false);setQuery("");router.push(href)}
  return <div className="module-shell">
    <a className="skip" href="#module-main">Skip to main content</a>
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/"><span className="brand-mark"/>LifeOS</Link>
      <nav>{nav.map(([label,href,Icon])=><Link className={label===active?"active":""} href={href} key={label}><Icon/><span>{label}</span></Link>)}</nav>
      <Link className="settings" href="/settings"><Gear/><span>Settings</span></Link>
    </aside>
    <header className="module-topbar"><h1>{title}</h1><div className="top-actions"><button className="search" onClick={()=>setPalette(true)}><MagnifyingGlass/><span>Search</span><kbd>⌘ K</kbd></button><button className="icon-button" aria-label="Open contextual assistant" onClick={()=>setAssistant(true)}><Sparkle/></button><button className="icon-button" aria-label={`Use ${theme==="dark"?"light":"dark"} theme`} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun/>:<Moon/>}</button><button className="icon-button unread" aria-label="Notifications" aria-expanded={notifications} onClick={()=>setNotifications(!notifications)}><Bell/></button>{action}</div>{notifications&&<aside className="notification-popover"><header><strong>Notifications</strong><button className="icon-button" aria-label="Close notifications" onClick={()=>setNotifications(false)}><X/></button></header><Link href="/capture">Lecture notes need review<small>12 minutes ago</small></Link><Link href="/automations">Drive sync needs attention<small>24 minutes ago</small></Link><Link href="/activity">View all activity</Link></aside>}</header>
    <main id="module-main" className="module-main">{children}</main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{([["Today","/",House],["Capture","/capture",Plus],["Tasks","/tasks",ListChecks],["Vault","/vault",Folder],["More","/settings",Command]] as const).map(([label,href,Icon],i)=><Link className={`${label===active?"active":""} ${i===1?"capture-nav":""}`} href={href} key={label}><Icon/><span>{label}</span></Link>)}</nav>
    {palette&&<ModalDialog className="palette-dialog" onClose={()=>setPalette(false)}><div className="palette-search"><MagnifyingGlass/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} aria-label="Search pages and actions" placeholder="Search LifeOS…"/><button className="icon-button" aria-label="Close search" onClick={()=>setPalette(false)}><X/></button></div><p>{results.length} results</p>{results.map(({label,detail,href,Icon})=><button key={label} onClick={()=>go(href)}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><kbd>↵</kbd></button>)}{!results.length&&<div className="palette-empty">No pages or actions match “{query}”.</div>}</ModalDialog>}
    {assistant&&<aside className="ai-panel" aria-label="Contextual assistant"><header><span><Sparkle/><strong>Plan with LifeOS</strong></span><button className="icon-button" aria-label="Close assistant" onClick={()=>setAssistant(false)}><X/></button></header><p>Based on your {title.toLowerCase()} context, the proposal review is the best next action before your 1 PM meeting.</p><ol><li><CheckSquare/><span><strong>Review the proposal</strong><small>25 minutes · Due today</small></span></li><li><FileText/><span><strong>Open meeting notes</strong><small>Source context from Vault</small></span></li><li><CalendarBlank/><span><strong>Join meeting with Dian</strong><small>Today at 13:00</small></span></li></ol><footer><button className="secondary">Edit plan</button><button className="primary">Start first step</button></footer><small>AI suggestions are drafts. Nothing changes without confirmation.</small></aside>}
  </div>;
}
