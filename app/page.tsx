"use client";

import {
  Bell, BookOpen, CalendarBlank, CaretRight, Check, CheckSquare, Clock,
  Code, Command, FileText, Folder, Gear, House, Lightning, ListChecks,
  MagnifyingGlass, Microphone, Moon, Paperclip, PaperPlaneTilt, Plus, Sparkle,
  Sun, Tray, UploadSimple, Warning, X
} from "@phosphor-icons/react";
import Link from "next/link";
import {FormEvent, useEffect, useRef, useState} from "react";
import {useAppState} from "./components/AppState";
import {showUnavailable} from "./components/ServiceNotice";

const nav = [
  ["Today",House],["Capture",Plus],["Calendar",CalendarBlank],["Tasks",CheckSquare],
  ["Vault",Folder],["Projects",Tray],["Study",BookOpen],["Coding",Code],["Automations",Lightning]
] as const;

const activity = [
  ["Study plan for OS exam.pdf uploaded to Vault","08:31",FileText],
  ["Database normalization notes task completed","Yesterday",Check],
  ["Pushed 3 commits to lifeos-sync","Yesterday",Code],
  ["Study group session scheduled for Jul 26","Yesterday",CalendarBlank],
] as const;

export default function Today() {
  const {addCapture,addFileCapture,captures,events,tasks,toggleTask,updateCapture}=useAppState();
  const [theme,setTheme] = useState<"dark"|"light">("dark");
  const [capture,setCapture] = useState("");
  const [reviewId,setReviewId] = useState<string|null>(null);
  const [palette,setPalette] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved=localStorage.getItem("lifeos-theme") as "dark"|"light"|null;
    if(saved)setTheme(saved);
  },[]);
  useEffect(() => {
    document.documentElement.dataset.theme=theme;
    localStorage.setItem("lifeos-theme",theme);
    const onKey=(e:KeyboardEvent)=>{
      if ((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k") {e.preventDefault();setPalette(true)}
      if ((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==="c") {e.preventDefault();input.current?.focus()}
      if (e.key==="Escape") setPalette(false);
    };
    addEventListener("keydown",onKey); return()=>removeEventListener("keydown",onKey);
  },[theme]);

  const todayEvents=events.filter(event=>event.day===4).toSorted((a,b)=>a.time.localeCompare(b.time));
  const todayTasks=tasks.filter(task=>task.due==="Today");
  const pendingCaptures=captures.filter(item=>item.status==="review").length;
  function submit(e:FormEvent) {e.preventDefault();if(capture.trim()){setReviewId(addCapture(capture.trim()));showUnavailable("AI interpretation is not connected. The card below is a sample preview; your original capture is saved only in this browser.")}}
  function closeReview(status:"confirmed"|"dismissed") {if(reviewId)updateCapture(reviewId,status);setReviewId(null);if(status==="confirmed")setCapture("")}

  return <div className="app-shell">
    <a className="skip" href="#main">Skip to main content</a>
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/"><span className="brand-mark"/>LifeOS</Link>
      <nav>{nav.map(([label,Icon])=><Link className={label==="Today"?"active":""} href={({Capture:"/capture",Calendar:"/calendar",Tasks:"/tasks",Vault:"/vault",Projects:"/projects",Study:"/study",Coding:"/coding",Automations:"/automations"} as Record<string,string>)[label]||"#"} key={label}><Icon/><span>{label}</span>{label==="Capture"&&<kbd>⇧C</kbd>}</Link>)}</nav>
      <Link className="settings" href="/settings"><Gear/><span>Settings</span></Link>
    </aside>

    <header className="topbar">
      <div className="date"><CalendarBlank/>Friday, July 24</div>
      <div className="top-actions">
        <button className="search" onClick={()=>setPalette(true)}><MagnifyingGlass/><span>Search</span><kbd>⌘ K</kbd></button>
        <button className="icon-button" aria-label={`Use ${theme==="dark"?"light":"dark"} theme`} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun/>:<Moon/>}</button>
        <button className="icon-button unread" aria-label="Notifications" data-unavailable="Live notifications require the backend connection. Sample activity remains available from Activity."><Bell/></button>
      </div>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="today-title">
        <p className="mobile-date">Friday, July 24</p>
        <h1 id="today-title">Good morning, Tim</h1>
        <p>Two meetings, three tasks due, and <Link className="text-link" href="/capture">{pendingCaptures || "no"} capture{pendingCaptures===1?"":"s"} need review</Link>.</p>
      </section>

      <form className="capture" id="capture" onSubmit={submit}>
        <label htmlFor="capture">Quick capture</label>
        <Plus aria-hidden="true"/>
        <input ref={input} id="capture" value={capture} onChange={e=>setCapture(e.target.value)} placeholder="Capture a thought, task, event, file, or command…"/>
        <button type="button" className="capture-tool" aria-label="Attach a file" onClick={()=>fileInput.current?.click()}><Paperclip/></button>
        <input ref={fileInput} type="file" hidden aria-hidden="true" tabIndex={-1} onChange={e=>{const file=e.target.files?.[0];if(file){addFileCapture(file);showUnavailable("File captured. Server interpretation runs once an AI provider is configured; the original is preserved when signed in.")}e.target.value=""}}/>
        <button type="button" className="capture-tool" aria-label="Record voice" data-unavailable="Voice transcription requires the AI backend. Use text capture for this browser-only prototype."><Microphone/></button>
        <button className="send" disabled={!capture.trim()} aria-label="Process capture"><PaperPlaneTilt/></button>
        <kbd>⌘ ⇧ C</kbd>
      </form>

      {reviewId&&<section className="review" aria-live="polite">
        <div className="review-head"><span><Sparkle/>Sample interpretation</span><button aria-label="Dismiss review" onClick={()=>closeReview("dismissed")}><X/></button></div>
        <div className="review-items">
          <article><CalendarBlank/><div><strong>Meeting with Dian</strong><span>Tomorrow · 1:00–2:00 PM · Reminder 12:00 PM</span></div></article>
          <article><CheckSquare/><div><strong>Review proposal</strong><span>Due tomorrow · RevoU Partnership</span></div></article>
        </div>
        <div className="review-actions"><button className="secondary" onClick={()=>setReviewId(null)}>Edit</button><button className="primary" onClick={()=>closeReview("confirmed")}><Check/>Confirm all</button></div>
      </section>}

      <section className="timeline" aria-labelledby="timeline-title">
        <div className="section-head"><h2 id="timeline-title">Today</h2><Link href="/calendar">Open calendar <CaretRight/></Link></div>
        <div className="timeline-list">
          {todayEvents.map(event=><article key={event.id}><time>{event.time}</time><span className="timeline-dot active-dot"/>{event.title.toLowerCase().includes("lecture")?<BookOpen/>:<CalendarBlank/>}<div><strong>{event.title}</strong><span>{event.location||"Calendar event"}</span></div><Link className="row-action" aria-label={`Open ${event.title}`} href="/calendar"><CaretRight/></Link></article>)}
          {todayTasks.map(task=><article className={task.completed?"completed":""} key={task.id}><time>Today</time><span className="timeline-dot"/><button className="checkbox" aria-label={task.completed?`Mark ${task.title} incomplete`:`Complete ${task.title}`} aria-pressed={task.completed} onClick={()=>toggleTask(task.id)}>{task.completed&&<Check weight="bold"/>}</button><div><strong>{task.title}</strong><span>{task.project} · Due today</span></div></article>)}
        </div>
      </section>

      <section className="activity" aria-labelledby="activity-title">
        <div className="section-head"><h2 id="activity-title">Recent activity</h2><Link href="/activity">View all <CaretRight/></Link></div>
        <div>{activity.map(([label,time,Icon])=><Link className="activity-row" href="/activity" key={label}><Icon/><span>{label}</span><time>{time}</time></Link>)}</div>
      </section>
    </main>

    <aside className="attention" aria-labelledby="attention-title">
      <h2 id="attention-title">Needs your attention</h2>
      <Link className="attention-item" href="/capture"><span className="status-icon warning"><FileText/></span><span><strong>Lecture notes on TCP/IP</strong><small>Captured 2h ago</small><em>Needs review</em></span><CaretRight/></Link>
      <Link className="attention-item" href="/automations"><span className="status-icon error"><Warning/></span><span><strong>Sync with Drive</strong><small>Automation failed</small><em>View details</em></span><CaretRight/></Link>
      <div className="rail-activity"><div className="section-head"><h2>Recent activity</h2><Link href="/activity">View all</Link></div>{activity.slice(0,3).map(([label,time,Icon])=><Link className="activity-row" href="/activity" key={label}><Icon/><span>{label}</span><time>{time}</time></Link>)}</div>
    </aside>

    <nav className="mobile-nav" aria-label="Mobile navigation">
      {([["Today","/",House],["Capture","/capture",Plus],["Tasks","/tasks",ListChecks],["Vault","/vault",Folder],["More","/settings",Command]] as const).map(([label,href,Icon],i)=><Link className={`${i===0?"active":""} ${i===1?"capture-nav":""}`} href={href} key={label}><Icon/><span>{label}</span></Link>)}
    </nav>

    {palette&&<div className="palette-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setPalette(false)}><dialog open aria-label="Command palette"><div className="palette-search"><MagnifyingGlass/><input autoFocus aria-label="Search commands" placeholder="Search LifeOS or run a command…"/><kbd>Esc</kbd></div><p>Quick actions</p>{([["New capture","#capture",Plus,"⌘ ⇧ C"],["Add task","/tasks",CheckSquare,"⌘ ⇧ T"],["Open calendar","/calendar",CalendarBlank,"G C"],["Search vault","/vault",Folder,"G V"]] as const).map(([label,href,Icon,key])=><Link href={href} onClick={()=>setPalette(false)} key={label}><Icon/><span>{label}</span><kbd>{key}</kbd></Link>)}</dialog></div>}
  </div>;
}
