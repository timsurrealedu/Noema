"use client";

import {
  Archive, Bell, BookOpen, CalendarBlank, CaretRight, Check, CheckSquare, CircleNotch, Clock,
  Code, Command, FileText, Flag, Folder, Gear, House, Lightning, ListChecks,
  MagnifyingGlass, Microphone, Moon, Paperclip, PaperPlaneTilt, PenNib, Plus, Sparkle,
  Sun, Tray, UploadSimple, Warning, X, Circle
} from "@phosphor-icons/react";
import Link from "next/link";
import {FormEvent, useEffect, useRef, useState} from "react";
import { Task, useAppState } from "./components/AppState";
import { ModalDialog } from "./components/ModalDialog";
import { HandwritingCapture } from "./components/HandwritingCapture";
import { ContextualAssistant } from "./components/ContextualAssistant";
import { showUnavailable } from "./components/ServiceNotice";
import { NoemaLogo } from "./components/NoemaLogo";
import { createId } from "./lib/id";

const nav = [
  ["Home",House],["Capture",Plus],["Calendar",CalendarBlank],
  ["Vault",Folder],["Coding",Code]
] as const;

const blankTask=():Task=>({id:createId(),title:"",project:"Inbox",due:"",dueAt:new Date().toISOString(),priority:"Medium",completed:false,status:"open"});
const jakartaParts=(value:string)=>Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value)).map(part=>[part.type,part.value]));
const dateValue=(value?:string|null)=>{if(!value)return "";const part=jakartaParts(value);return `${part.year}-${part.month}-${part.day}`};
const dateTimeValue=(value?:string|null)=>{if(!value)return "";const part=jakartaParts(value);return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`};
const taskStartTime=(value?:string|null)=>value?new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value)):"Any time";
const taskDue=(task:Task)=>{const value=task.dueAt||task.due;if(!value||value==="No date")return "No date";const date=new Date(value);if(Number.isNaN(date.valueOf()))return task.due;const options:Intl.DateTimeFormatOptions={weekday:"long",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"Asia/Jakarta"};if(date.getFullYear()!==new Date().getFullYear())options.year="numeric";return new Intl.DateTimeFormat("en-US",options).format(date)};
const jakartaIso=(value:string)=>new Date(`${value}:00+07:00`).toISOString();
const mobileTaskDue=(task:Task)=>{const due=taskDue(task),comma=due.indexOf(", ");return comma<0?due:`${due.slice(0,3)}, ${due.slice(comma+2)}`};

const LABELS = ["All", "Inbox", "Today", "Upcoming", "Overdue", "Completed"] as const;

export default function Home() {
  const {addAndInterpretCapture,addFileCapture,captures,confirmCapture,events,tasks,projects,toggleTask,saveTask,archiveTask,updateCapture}=useAppState();
  const [theme,setTheme] = useState<"dark"|"light">("dark");
  const [capture,setCapture] = useState("");
  const [reviewId,setReviewId] = useState<string|null>(null);
  const [recording,setRecording] = useState(false);
  const [palette,setPalette] = useState(false);
  const [assistant,setAssistant] = useState(false);
  const [handwriting,setHandwriting] = useState(false);
  const [filter,setFilter] = useState<string>("All");
  const [draft,setDraft] = useState<Task|null>(null);

  const input = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder|null>(null);

  useEffect(() => {
    const saved=localStorage.getItem("noema-theme") as "dark"|"light"|null;
    if(saved)setTheme(saved);
  },[]);
  useEffect(() => {
    document.documentElement.dataset.theme=theme;
    localStorage.setItem("noema-theme",theme);
    const onKey=(e:KeyboardEvent)=>{
      if ((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k") {e.preventDefault();setPalette(true)}
      if ((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="j") {e.preventDefault();setAssistant(true)}
      if ((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==="c") {e.preventDefault();input.current?.focus()}
      if ((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==="t") {e.preventDefault();setDraft(blankTask())}
      if (e.key==="Escape") { setPalette(false); setAssistant(false); }
    };
    addEventListener("keydown",onKey); return()=>removeEventListener("keydown",onKey);
  },[theme]);
  useEffect(()=>()=>{if(recorder.current?.state==="recording")recorder.current.stop();recorder.current?.stream.getTracks().forEach(track=>track.stop())},[]);

  useEffect(() => {
    const id=new URLSearchParams(location.search).get("open");
    if(id==="new") { setDraft(blankTask()); }
    else if(id) { const task=tasks.find(item=>item.id===id); if(task){setFilter("All");setDraft({...task})} }
  },[tasks]);

  const now=new Date(),todayLabel=new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(now);
  const greeting=now.getHours()<12?"Good morning":now.getHours()<18?"Good afternoon":"Good evening";
  const todayEvents=events.filter(event=>event.day===(now.getDay()+6)%7).toSorted((a,b)=>a.time.localeCompare(b.time));
  const todayTasks=tasks.filter(task=>!task.archived&&task.dueAt&&dateValue(task.dueAt)===dateValue(now.toISOString()));
  const pendingCaptures=captures.filter(item=>item.status==="review").length;
  const review=captures.find(item=>item.id===reviewId);

  function submitCapture(e:FormEvent) {e.preventDefault();if(capture.trim())setReviewId(addAndInterpretCapture(capture.trim()))}
  function closeReview(status:"confirmed"|"dismissed") {if(reviewId){if(status==="confirmed")confirmCapture(reviewId);else updateCapture(reviewId,status)}setReviewId(null);if(status==="confirmed")setCapture("")}
  async function toggleRecording(){
    if(recorder.current?.state==="recording"){recorder.current.stop();return}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true}),chunks:Blob[]=[];const active=new MediaRecorder(stream);recorder.current=active;active.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};active.onstop=()=>{const type=active.mimeType||"audio/webm",extension=type.includes("ogg")?"ogg":"webm";addFileCapture(new File(chunks,`voice-${Date.now()}.${extension}`,{type}));stream.getTracks().forEach(track=>track.stop());recorder.current=null;setRecording(false)};active.start();setRecording(true)}catch(error){setRecording(false);showUnavailable(error instanceof Error?error.message:"Microphone access failed")}
  }

  function submitTask(event:FormEvent){
    event.preventDefault();
    if(!draft?.title.trim())return;
    saveTask({...draft,title:draft.title.trim()});
    setDraft(null);
  }

  const todayStr = dateValue(new Date().toISOString());

  const matches = (task: Task, label: string) => {
    if (task.archived) return false;
    if (label === "Completed") return task.completed;
    if (task.completed) return false;

    if (label === "All") return true;
    if (label === "Overdue") return !!task.dueAt && dateValue(task.dueAt) < todayStr;
    if (label === "Today") return dateValue(task.dueAt) === todayStr;
    if (label === "Upcoming") return !!task.dueAt && dateValue(task.dueAt) > todayStr;
    if (label === "Inbox") return !task.dueAt;
    return false;
  };

  const counts=Object.fromEntries(LABELS.map(label => [label, tasks.filter(task => matches(task, label)).length]));
  const visibleTasks = tasks.filter(task => matches(task, filter));
  const readyTasks = tasks.filter(task => !task.completed && !task.archived).length;

  const renderTask = (task: Task) => {
    const isOverdue = matches(task, "Overdue");
    return (
      <article className={`${task.completed ? "completed " : ""}${draft?.id === task.id ? "selected " : ""}${isOverdue ? "overdue" : ""}`} key={task.id}>
        <button className={`task-check ${isOverdue ? "overdue-check" : ""}`} aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`} aria-pressed={task.completed} onClick={() => toggleTask(task.id)}>
          {task.completed ? <Check weight="bold" /> : <Circle />}
        </button>
        <button className="task-copy" onClick={() => setDraft({ ...task })}>
          <strong>{task.title}</strong>
        </button>
        <span className="task-source"><Flag /> {task.project}{task.subtasks?.length ? ` · ${task.subtasks.length} subtasks` : ""}</span>
        <time>{mobileTaskDue(task)}</time>
        <span className="task-start">{taskStartTime(task.scheduledStartAt)}</span>
        <button className="row-menu" aria-label={`Edit ${task.title}`} onClick={() => setDraft({ ...task })}>Edit</button>
      </article>
    );
  };

  const overdueList = tasks.filter(t => matches(t, "Overdue"));
  const todayList = tasks.filter(t => matches(t, "Today"));
  const upcomingList = tasks.filter(t => matches(t, "Upcoming") || matches(t, "Inbox"));


  return <div className="app-shell">
    <a className="skip" href="#main">Skip to main content</a>
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/"><NoemaLogo /><span>Noema</span></Link>
      <nav>{nav.map(([label,Icon])=><Link className={label==="Home"?"active":""} href={({Home:"/",Capture:"/capture",Calendar:"/calendar",Vault:"/vault",Coding:"/coding"} as Record<string,string>)[label]||"#"} key={label}><Icon/><span>{label}</span></Link>)}</nav>
      <Link className="settings" href="/settings"><Gear/><span>Settings</span></Link>
    </aside>

    <header className="topbar">
      <div className="date"><CalendarBlank/>{todayLabel}</div>
      <div className="top-actions">
        <button className="search" onClick={()=>setPalette(true)}><MagnifyingGlass/><span>Search</span><kbd>⌘ K</kbd></button>
        <button className="icon-button" aria-label="Open contextual assistant" onClick={()=>setAssistant(true)}><Sparkle/></button>
        <button className="icon-button" aria-label={`Use ${theme==="dark"?"light":"dark"} theme`} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun/>:<Moon/>}</button>
        <button className="icon-button unread" aria-label="Notifications" data-unavailable="Live notifications require the backend connection. Sample activity remains available from Activity."><Bell/></button>
      </div>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="home-title">
        <p className="mobile-date">{todayLabel}</p>
        <h1 id="home-title">{greeting}</h1>
        <p>{todayEvents.length} scheduled item{todayEvents.length===1?"":"s"} today, {readyTasks} task{readyTasks===1?" is":"s are"} ready, and <Link className="text-link" href="/capture">{pendingCaptures || "no"} capture{pendingCaptures===1?"":"s"} need review</Link>.</p>
      </section>

      <form className="capture" id="quick-capture" onSubmit={submitCapture}>
        <label htmlFor="capture">Quick capture</label>
        <button type="button" className="capture-add" aria-label="Attach a file" onClick={()=>fileInput.current?.click()}><Plus/></button>
        <input ref={input} id="capture" name="quick-capture" type="text" inputMode="text" autoComplete="off" autoCapitalize="sentences" spellCheck value={capture} onChange={e=>setCapture(e.target.value)} placeholder="Capture a thought, task, event, file, or command…"/>
        <input ref={fileInput} type="file" hidden aria-hidden="true" tabIndex={-1} onChange={e=>{const file=e.target.files?.[0];if(file)addFileCapture(file);e.target.value=""}}/>
        <button type="button" className="capture-tool" aria-label="Write a handwritten note" onClick={()=>setHandwriting(true)}><PenNib/></button>
        <button type="button" className="capture-tool" aria-label={recording?"Stop recording":"Record voice"} aria-pressed={recording} onClick={()=>void toggleRecording()}><Microphone/></button>
        <button className="send" disabled={!capture.trim()} aria-label="Process capture"><PaperPlaneTilt/></button>
      </form>

      {review&&<section className="review" aria-live="polite">
        <div className="review-head"><span><Sparkle/>{review.status==="processing"?"Interpreting capture":review.status==="failed"?"Interpretation failed":"Interpretation ready"}</span><button aria-label="Dismiss review" onClick={()=>closeReview("dismissed")}><X/></button></div>
        {review.status==="processing"?<div className="review-processing"><CircleNotch className="spin"/><span>Reading the capture and identifying useful objects…</span></div>:review.status==="failed"?<p className="review-status-text" role="alert">{review.error||"Processing failed. Open Capture to retry."}</p>:<div className="review-items">{review.objects.map((object,index)=><article key={`${object.type}-${index}`}>{object.type==="event"?<CalendarBlank/>:object.type==="task"?<CheckSquare/>:<FileText/>}<div><strong>{object.title}</strong><span>{object.detail}</span></div></article>)}</div>}
        <div className="review-actions"><Link className="secondary" href={`/capture?open=${review.id}`}>{review.status==="processing"?"Continue in Capture":"Edit"}</Link>{review.status==="review"&&review.objects.length>0&&<button className="primary" onClick={()=>closeReview("confirmed")}><Check/>Confirm all</button>}</div>
      </section>}

      <section className="tasks-section" aria-label="Tasks" style={{marginTop:"24px"}}>
        <div className={`task-layout no-subnav${draft ? " editing" : " no-inspector"}`}>
          <section className="task-list" aria-label="Task list">
            <div className="list-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",marginBottom:"16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <label className="task-view-select">
                  <CalendarBlank />
                  <span className="sr-only">Task view</span>
                  <select aria-label="Task view" value={filter} onChange={event=>setFilter(event.target.value)}>
                    {LABELS.map(label => <option key={label}>{label}</option>)}
                  </select>
                </label>
                <h3 id="task-list-title" style={{display:"none"}}>{filter}</h3>
              </div>
              <button className="primary top-primary" onClick={() => setDraft(blankTask())}><Plus />New task</button>
            </div>

            {filter === "All" ? (
              <div className="task-grouped-sections">
                {overdueList.length > 0 && (
                  <div className="task-group">
                    <h4 className="task-group-title overdue">Overdue ({overdueList.length})</h4>
                    {overdueList.map(renderTask)}
                  </div>
                )}
                {todayList.length > 0 && (
                  <div className="task-group">
                    <h4 className="task-group-title today">Today ({todayList.length})</h4>
                    {todayList.map(renderTask)}
                  </div>
                )}
                {upcomingList.length > 0 && (
                  <div className="task-group">
                    <h4 className="task-group-title upcoming">Upcoming ({upcomingList.length})</h4>
                    {upcomingList.map(renderTask)}
                  </div>
                )}
                {!visibleTasks.length && (
                  <div className="empty-state">
                    <Check />
                    <h3>Nothing here</h3>
                    <p>This view is clear.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {visibleTasks.map(renderTask)}
                {!visibleTasks.length && (
                  <div className="empty-state">
                    <Check />
                    <h3>Nothing here</h3>
                    <p>This view is clear.</p>
                  </div>
                )}
              </>
            )}
          </section>

          {draft && (
            <aside className="object-inspector">
              <div className="object-inspector-head">
                <div>
                  <span>{tasks.some(task => task.id === draft.id) ? "Edit task" : "New task"}</span>
                  <small>{draft.vaultSource ? "Changes rewrite only this Obsidian checklist line." : "Use plain language; changes appear on Home immediately."}</small>
                </div>
                <button className="icon-button" aria-label="Close task inspector" onClick={() => setDraft(null)}><X /></button>
              </div>
              <form onSubmit={submitTask}>
                <label>Task name<input autoFocus value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="What needs doing?" required /></label>
                <label>Project
                  <select value={draft.projectId || ""} onChange={e => { const project = projects.find(item => item.id === e.target.value); setDraft({ ...draft, projectId: project?.id || null, project: project?.name || "Inbox" }) }}>
                    <option value="">Inbox</option>
                    {projects.filter(item => item.status !== "Archived").map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </label>
                <div className="field-row">
                  <label>Due<input type="date" value={dateValue(draft.dueAt)} onChange={e => setDraft({ ...draft, dueAt: e.target.value ? new Date(`${e.target.value}T00:00:00+07:00`).toISOString() : null, scheduledStartAt: null })} /></label>
                  <label>Priority
                    <select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Task["priority"] })}>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </label>
                </div>
                <label>Scheduled time<input type="datetime-local" value={dateTimeValue(draft.scheduledStartAt)} onChange={e => setDraft({ ...draft, scheduledStartAt: e.target.value ? jakartaIso(e.target.value) : null, dueAt: e.target.value ? jakartaIso(e.target.value) : draft.dueAt })} /></label>
                <label>Reminder<input type="datetime-local" value={dateTimeValue(draft.reminderAt)} onChange={e => setDraft({ ...draft, reminderAt: e.target.value ? jakartaIso(e.target.value) : null })} /></label>
                <label>Repeat
                  <select value={draft.recurrence || "Never"} onChange={e => setDraft({ ...draft, recurrence: e.target.value })}>
                    <option>Never</option>
                    <option>Daily</option>
                    <option>Weekdays</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </label>
                <label>Subtasks<textarea value={(draft.subtasks || []).join("\n")} onChange={e => setDraft({ ...draft, subtasks: e.target.value.split("\n").filter(Boolean) })} placeholder="One subtask per line" /></label>
                <label className="check-field"><input type="checkbox" checked={draft.completed} onChange={e => setDraft({ ...draft, completed: e.target.checked })} /> Mark completed</label>
                {draft.vaultSource && (
                  <div className="permission-note">
                    <CalendarBlank />
                    <span>
                      <strong>{draft.vaultSource.sourceName} · {draft.vaultSource.relativePath}</strong>
                      <small>Line {draft.vaultSource.lineNumber} · ^{draft.vaultSource.blockId}</small>
                      <Link href={`/vault?open=${encodeURIComponent(draft.vaultSource.noteId)}`}>Open source note</Link>
                    </span>
                  </div>
                )}
                <div className="inspector-actions">
                  {tasks.some(task => task.id === draft.id) && (
                    <button type="button" className="icon-button danger" aria-label="Archive task" onClick={() => { archiveTask(draft.id); setDraft(null) }}><Archive /></button>
                  )}
                  <button type="button" className="secondary" onClick={() => setDraft(null)}>Cancel</button>
                  <button className="primary">Save task</button>
                </div>
              </form>
            </aside>
          )}
        </div>
      </section>

      <section className="activity" aria-labelledby="activity-title"><div className="section-head"><h2 id="activity-title">Recent activity</h2><Link href="/activity">View all <CaretRight/></Link></div><p><Link className="text-link" href="/activity">Open activity</Link> to review persisted workspace changes.</p></section>
    </main>

    <aside className="attention" aria-labelledby="attention-title">
      <h2 id="attention-title">Needs your attention</h2>
      {captures.filter(item=>item.status==="review").slice(0,3).map(item=><Link className="attention-item" href={`/capture?open=${item.id}`} key={item.id}><span className="status-icon warning"><FileText/></span><span><strong>{item.text}</strong><small>{item.sourceLabel}</small><em>Needs review</em></span><CaretRight/></Link>)}
      {!pendingCaptures&&<p>Nothing needs review.</p>}
    </aside>

    <nav className="mobile-nav" aria-label="Mobile navigation">
      {([["Home","/",House],["Capture","/capture",Plus],["Calendar","/calendar",CalendarBlank],["Vault","/vault",Folder],["Coding","/coding",Code]] as const).map(([label,href,Icon],i)=><Link className={`${i===0?"active":""} ${i===1?"capture-nav":""}`} href={href} key={label}><Icon/><span>{label}</span></Link>)}
    </nav>

    {palette&&<ModalDialog className="palette-dialog" onClose={()=>setPalette(false)}><div className="palette-search"><MagnifyingGlass/><input autoFocus aria-label="Search commands" placeholder="Search Noema or run a command…"/><button className="icon-button" aria-label="Close search" onClick={()=>setPalette(false)}><X/></button></div><p>Quick actions</p>{([["New capture","#capture",Plus,""],["Add task","/?open=new",CheckSquare,"⌘ ⇧ T"],["Open calendar","/calendar",CalendarBlank,"G C"],["Search vault","/vault",Folder,"G V"]] as const).map(([label,href,Icon,key])=><Link href={href} onClick={()=>{setPalette(false);if(href==="/?open=new")setDraft(blankTask())}} key={label}><Icon/><span>{label}</span>{key&&<kbd>{key}</kbd>}</Link>)}</ModalDialog>}
    {handwriting&&<HandwritingCapture onClose={()=>setHandwriting(false)}/>}
    <ContextualAssistant
      isOpen={assistant}
      onClose={() => setAssistant(false)}
      active="Home"
      title="Home"
    />
  </div>;
}
