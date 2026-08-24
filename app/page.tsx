"use client";

import {
  Archive, BookOpen, CalendarBlank, Camera, CaretRight, Check, CheckSquare, CircleNotch, Clock,
  Code, Command, FileText, Folder, Gear, House, Lightning, ListChecks,
  MagnifyingGlass, Microphone, Moon, Paperclip, PaperPlaneTilt, PenNib, Plus, Sparkle,
  Sun, Tray, UploadSimple, Warning, X, Circle, DotsThree
} from "@phosphor-icons/react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {FormEvent, useEffect, useRef, useState} from "react";
import { Task, useAppState } from "./components/AppState";
import { ModalDialog } from "./components/ModalDialog";
import {DurableRecorder} from "./components/DurableRecorder";
import { HandwritingCapture } from "./components/HandwritingCapture";
import { ContextualAssistant } from "./components/ContextualAssistant";
import { showUnavailable } from "./components/ServiceNotice";
import { NoemaLogo } from "./components/NoemaLogo";
import { NotificationButton } from "./components/NotificationButton";
import { createId } from "./lib/id";

const nav = [
  ["Home","/",House],["Capture","/capture",Plus],["Vault","/vault",Folder],
  ["Calendar","/calendar",CalendarBlank],["Coding","/coding",Code]
] as const;

const blankTask=():Task=>({id:createId(),title:"",project:"Inbox",due:"",dueAt:new Date().toISOString(),priority:"Medium",completed:false,status:"open",reminderAt:null});
const localParts=(value:string)=>Object.fromEntries(new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value)).map(part=>[part.type,part.value]));
const dateValue=(value?:string|null)=>{if(!value)return "";const part=localParts(value);return `${part.year}-${part.month}-${part.day}`};
const dateTimeValue=(value?:string|null)=>{if(!value)return "";const part=localParts(value);return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`};
const taskStartTime=(value?:string|null)=>value?new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value)):"Any time";
const taskDue=(task:Task)=>{const value=task.dueAt||task.due;if(!value||value==="No date")return "No date";const date=new Date(value);if(Number.isNaN(date.valueOf()))return task.due;const options:Intl.DateTimeFormatOptions={weekday:"long",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"};if(date.getFullYear()!==new Date().getFullYear())options.year="numeric";return new Intl.DateTimeFormat("en-US",options).format(date)};
const localIso=(value:string)=>new Date(value).toISOString();
const mobileTaskDue=(task:Task)=>{const due=taskDue(task),comma=due.indexOf(", ");return comma<0?due:`${due.slice(0,3)}, ${due.slice(comma+2)}`};
const overdueDays=(task:Task,today:string)=>task.dueAt?Math.max(1,Math.round((new Date(`${today}T00:00:00Z`).valueOf()-new Date(`${dateValue(task.dueAt)}T00:00:00Z`).valueOf())/86_400_000)):0;

export default function Home() {
  const {addAndInterpretCapture,addCapture,addFileCapture,addFileCaptures,addVoiceCapture,captures,confirmCapture,events,tasks,projects,toggleTask,saveTask,archiveTask,updateCapture}=useAppState();
  const [theme,setTheme] = useState<"dark"|"light">("dark");
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const [capture,setCapture] = useState("");
  const [reviewId,setReviewId] = useState<string|null>(null);
  const [palette,setPalette] = useState(false);
  const [paletteQuery,setPaletteQuery] = useState("");
  const [assistant,setAssistant] = useState(false);
  const [handwriting,setHandwriting] = useState(false);
  const [autoInterpret,setAutoInterpret] = useState(true);
  const cameraBatch = useRef<File[]>([]);
  const [collapsedGroups,setCollapsedGroups] = useState<Set<string>>(new Set());
  const [draft,setDraft] = useState<Task|null>(null);
  const [taskTitleError,setTaskTitleError] = useState("");
  const [mounted,setMounted] = useState(false);
  const [modKey,setModKey] = useState("⌘");
  const [paletteActive,setPaletteActive] = useState(0);
  const router = useRouter();

  const input = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const openTargetRef = useRef<string|null>(null);
  const openResolvedRef = useRef(false);

  useEffect(() => {
    const saved=localStorage.getItem("noema-theme") as "dark"|"light"|null;
    if(saved)setTheme(saved);
    setAutoInterpret(localStorage.getItem("noema-auto-interpret")!=="off");
    setMounted(true);
    if(!/Mac|iPhone|iPad|iPod/i.test(navigator.platform||""))setModKey("Ctrl");
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

  // Restore unsent capture draft from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("noema-capture-draft");
      if (saved) setCapture(saved);
    } catch {}
  }, []);
  // Persist capture draft to sessionStorage
  useEffect(() => {
    try {
      if (capture) sessionStorage.setItem("noema-capture-draft", capture);
      else sessionStorage.removeItem("noema-capture-draft");
    } catch {}
  }, [capture]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("open");
    if (!id) return;
    openTargetRef.current = id;
    if (id === "new") {
      if (!draft?.title) setDraft(blankTask());
      openResolvedRef.current = true;
    }
  }, []);
  useEffect(() => {
    if (openResolvedRef.current || !openTargetRef.current) return;
    const id = openTargetRef.current;
    const task = tasks.find(item => item.id === id);
    if (task) { setDraft({...task}); openResolvedRef.current = true; }
  }, [tasks]);

  const now=new Date();
  const todayLabel=mounted?new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(now):"";
  const greeting=mounted?(now.getHours()<12?"Good morning":now.getHours()<18?"Good afternoon":"Good evening"):"";
  const todayEvents=mounted?events.filter(event=>event.day===(now.getDay()+6)%7).toSorted((a,b)=>a.time.localeCompare(b.time)):[];
  const pendingCaptures=captures.filter(item=>item.status==="review").length;
  const review=captures.find(item=>item.id===reviewId);

  function submitCapture(e:FormEvent) {e.preventDefault();const text=capture.trim();if(!text)return;setCapture("");setReviewId(autoInterpret?addAndInterpretCapture(text):addCapture(text))}
  function toggleAutoInterpret(){setAutoInterpret(value=>{const next=!value;localStorage.setItem("noema-auto-interpret",next?"on":"off");return next})}
  function handleCameraSelection(files:FileList|null){if(!files?.length)return;cameraBatch.current=Array.from(files).filter(file=>file.type.startsWith("image/"));if(cameraBatch.current.length)setReviewId(addFileCaptures(cameraBatch.current));cameraBatch.current=[]}
  function closeReview(status:"confirmed"|"dismissed") {if(reviewId){if(status==="confirmed")confirmCapture(reviewId);else updateCapture(reviewId,status)}setReviewId(null)}
  function handleVoiceFinished(file:File){setReviewId(addVoiceCapture(file))}

  function submitTask(event:FormEvent){
    event.preventDefault();
    if(!draft?.title.trim()){setTaskTitleError("Enter a task name.");return}
    saveTask({...draft,title:draft.title.trim()});
    setTaskTitleError("");
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

  const readyTasks = tasks.filter(task => !task.completed && !task.archived).length;
  const toggleGroup=(group:string)=>setCollapsedGroups(current=>{const next=new Set(current);next.has(group)?next.delete(group):next.add(group);return next});

  const renderTask = (task: Task) => {
    const isOverdue = matches(task, "Overdue");
    return (
      <article className={`${task.completed ? "completed " : ""}${draft?.id === task.id ? "selected " : ""}${isOverdue ? "overdue" : ""}`} key={task.id}>
        <button className={`task-check ${isOverdue ? "overdue-check" : ""}`} aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`} aria-pressed={task.completed} onClick={() => toggleTask(task.id)}>
          {task.completed ? <Check weight="bold" /> : <Circle />}
        </button>
        <button className="task-copy" onClick={() => setDraft({ ...task })}>
          <strong>{task.title}</strong>
          <span className="task-primary-meta">{task.project}{isOverdue&&<><span aria-hidden="true"> · </span><span className="task-overdue-relative">{overdueDays(task,todayStr)} day{overdueDays(task,todayStr)===1?"":"s"} overdue</span></>}</span>
          <span className="task-due-exact">{mobileTaskDue(task)}{task.scheduledStartAt&&` · ${taskStartTime(task.scheduledStartAt)}`}</span>
        </button>
        <button className="row-menu" aria-label={`Edit ${task.title}`} onClick={() => setDraft({ ...task })}><DotsThree weight="bold" /></button>
      </article>
    );
  };

  const categories = ["Today", "Upcoming", "Overdue", "Inbox", "Completed"] as const;
  const overdueList = tasks.filter(t => matches(t, "Overdue"));
  const todayList = tasks.filter(t => matches(t, "Today"));
  const upcomingList = tasks.filter(t => matches(t, "Upcoming") || matches(t, "Inbox"));
  const completedList = tasks.filter(t => matches(t, "Completed"));
  const counts=Object.fromEntries(categories.map(c=>[c,tasks.filter(t=>matches(t,c)).length]));

  const closePalette=()=>{setPalette(false);setPaletteQuery("");setPaletteActive(0)};
  const paletteQueryText=paletteQuery.trim().toLowerCase();
  const paletteResults=[
    {id:"capture",label:"New capture",Icon:Plus,hint:"",run:()=>{closePalette();input.current?.focus()}},
    {id:"task",label:"Add task",Icon:CheckSquare,hint:`${modKey}\u00A0⇧\u00A0T`,run:()=>{closePalette();router.push("/?open=new");setDraft(blankTask())}},
    {id:"calendar",label:"Open calendar",Icon:CalendarBlank,hint:"",run:()=>{closePalette();router.push("/calendar")}},
    {id:"vault",label:"Search vault",Icon:Folder,hint:"",run:()=>{closePalette();router.push("/vault")}}
  ].filter(item=>item.label.toLowerCase().includes(paletteQueryText));
  const activeIndex=Math.min(paletteActive,Math.max(0,paletteResults.length-1));


  return <div className="app-shell">
    <a className="skip" href="#main">Skip to main content</a>
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/"><NoemaLogo /><span>Noema</span></Link>
      <nav>{nav.map(([label,href,Icon])=><Link className={label==="Home"?"active":""} href={href} key={label}><Icon/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-footer">
        <Link className="settings" href="/settings"><Gear/><span>Settings</span></Link>
        <button className="icon-button theme-toggle" aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><ThemeIcon /></button>
      </div>
    </aside>

    <header className="topbar">
      <div className="date"><CalendarBlank/>{todayLabel}</div>
      <div className="top-actions">
        <button className="search" onClick={()=>setPalette(true)}><MagnifyingGlass/><span>Search</span><kbd>{modKey}&nbsp;K</kbd></button>
        <button className="icon-button" aria-label="Open contextual assistant" onClick={()=>setAssistant(true)}><Sparkle/></button>
        <NotificationButton/>
      </div>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="home-title">
        <p className="mobile-date">{todayLabel}</p>
        <h1 id="home-title">{greeting}</h1>
        <div className="home-attention-summary" aria-label="What needs your attention">
          <span className="attention-stat scheduled"><strong>{todayEvents.length}</strong> scheduled</span>
          <span className="attention-stat ready"><strong>{readyTasks}</strong> ready</span>
          <Link className="attention-stat review" href="/capture"><strong>{pendingCaptures}</strong> review</Link>
        </div>
      </section>

      <form className="capture" id="quick-capture" onSubmit={submitCapture}>
        <label htmlFor="capture">Quick capture</label>
        <button type="button" className="capture-add" aria-label="Attach a file" onClick={()=>fileInput.current?.click()}><Plus/></button>
        <input ref={input} id="capture" name="quick-capture" type="text" inputMode="text" autoComplete="off" autoCapitalize="sentences" spellCheck value={capture} onChange={e=>setCapture(e.target.value)} placeholder="Capture anything…"/>
        <button type="button" className="capture-tool capture-camera" aria-label="Take photos to capture" onClick={()=>cameraInput.current?.click()}><Camera/></button>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" multiple hidden aria-hidden="true" tabIndex={-1} onChange={e=>{handleCameraSelection(e.target.files);e.target.value=""}}/>
        <input ref={fileInput} type="file" hidden aria-hidden="true" tabIndex={-1} onChange={e=>{const file=e.target.files?.[0];if(file)addFileCapture(file);e.target.value=""}}/>
        <button type="button" className={`capture-tool capture-auto-interpret ${autoInterpret?"active":""}`} aria-label={autoInterpret?"AI interpretation on":"AI interpretation off"} aria-pressed={autoInterpret} title={autoInterpret?"AI will propose actions from captures. Tap to keep them raw.":"Captures stay raw inbox items. Tap to enable AI."} onClick={toggleAutoInterpret}><Sparkle weight={autoInterpret?"fill":"regular"}/></button>
        <button type="button" className="capture-tool capture-handwriting" aria-label="Write a handwritten note" onClick={()=>setHandwriting(true)}><PenNib/></button>
        <DurableRecorder onFinished={handleVoiceFinished} label="Record voice"/>
        <button className="send" disabled={!capture.trim()} aria-label="Process capture"><PaperPlaneTilt/></button>
      </form>

      {review&&<section className="review" aria-live="polite">
        <div className="review-head"><span><Sparkle/>{review.status==="processing"?"Interpreting capture":review.status==="failed"?"Interpretation failed":"Interpretation ready"}</span><button aria-label="Dismiss review" onClick={()=>closeReview("dismissed")}><X/></button></div>
        {review.status==="processing"?<div className="review-processing"><CircleNotch className="spin"/><span>Reading the capture and identifying useful objects…</span></div>:review.status==="failed"?<p className="review-status-text" role="alert">{review.error||"Processing failed. Open Capture to retry."}</p>:<div className="review-items">{review.objects.map((object,index)=><article key={`${object.type}-${index}`}>{object.type==="event"?<CalendarBlank/>:object.type==="task"?<CheckSquare/>:<FileText/>}<div><strong>{object.title}</strong><span>{object.detail}</span></div></article>)}</div>}
        <div className="review-actions"><Link className="secondary" href={`/capture?open=${review.id}`}>{review.status==="processing"?"Continue in Capture":"Edit"}</Link>{review.status==="review"&&review.objects.length>0&&<button className="primary" onClick={()=>closeReview("confirmed")}><Check/>Confirm all</button>}</div>
      </section>}

      <section className="tasks-section home-tasks" aria-label="Tasks">
        <div className={`task-layout no-subnav${draft ? " editing" : " no-inspector"}`}>
          <section className="task-list" aria-label="Task list">
            <div className="task-grouped-sections">
                {overdueList.length > 0 && (
                  <div className="task-group">
                    <button className="task-group-title overdue" aria-expanded={!collapsedGroups.has("overdue")} onClick={()=>toggleGroup("overdue")}><span>Overdue ({overdueList.length})</span><CaretRight/></button>
                    {!collapsedGroups.has("overdue")&&overdueList.map(renderTask)}
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
                    <button className="task-group-title upcoming" aria-expanded={!collapsedGroups.has("upcoming")} onClick={()=>toggleGroup("upcoming")}><span>Upcoming ({upcomingList.length})</span><CaretRight/></button>
                    {!collapsedGroups.has("upcoming")&&upcomingList.map(renderTask)}
                  </div>
                )}
                {completedList.length > 0 && (
                  <div className="task-group">
                    <button className="task-group-title done" aria-expanded={!collapsedGroups.has("done")} onClick={()=>toggleGroup("done")}><span>Done ({completedList.length})</span><CaretRight/></button>
                    {!collapsedGroups.has("done")&&completedList.map(renderTask)}
                  </div>
                )}
                {!overdueList.length && !todayList.length && !upcomingList.length && !completedList.length && (
                  <div className="empty-state">
                    <Check />
                    <h3>Nothing here</h3>
                    <p>This view is clear. Add the next thing that needs your attention.</p>
                    <button className="primary mobile-primary-action" onClick={()=>{setTaskTitleError("");setDraft(blankTask())}}>Create task</button>
                  </div>
                )}
            </div>
          </section>

          {draft && (
            <aside className="object-inspector" role="dialog" aria-labelledby="task-editor-title">
              <div className="object-inspector-head">
                <div>
                  <span id="task-editor-title">{tasks.some(task => task.id === draft.id) ? "Edit task" : "New task"}</span>
                  <small>{draft.vaultSource ? "Changes rewrite only this Obsidian checklist line." : "Use plain language; changes appear on Home immediately."}</small>
                </div>
                <button className="icon-button" aria-label="Close task inspector" onClick={() => setDraft(null)}><X /></button>
              </div>
              <form onSubmit={submitTask}>
                <label>Task name<input autoFocus value={draft.title} onChange={e => {setDraft({ ...draft, title: e.target.value });if(taskTitleError)setTaskTitleError("")}} placeholder="What needs doing?" aria-invalid={!!taskTitleError} aria-describedby={taskTitleError?"task-title-error":undefined} /></label>
                {taskTitleError&&<p className="field-error" id="task-title-error" role="alert">{taskTitleError}</p>}
                <label>Project
                  <select value={draft.projectId || ""} onChange={e => { const project = projects.find(item => item.id === e.target.value); setDraft({ ...draft, projectId: project?.id || null, project: project?.name || "Inbox" }) }}>
                    <option value="">Inbox</option>
                    {projects.filter(item => item.status !== "Archived").map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </label>
                <div className="field-row">
                  <label>Due<input type="date" value={dateValue(draft.dueAt)} onChange={e => setDraft({ ...draft, dueAt: e.target.value ? localIso(`${e.target.value}T00:00:00`) : null, scheduledStartAt: null })} /></label>
                  <label>Priority
                    <select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Task["priority"] })}>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </label>
                </div>
                <label>Scheduled time<input type="datetime-local" value={dateTimeValue(draft.scheduledStartAt)} onChange={e => setDraft({ ...draft, scheduledStartAt: e.target.value ? localIso(e.target.value) : null, dueAt: e.target.value ? localIso(e.target.value) : draft.dueAt })} /></label>
                <label>Reminder<input type="datetime-local" value={dateTimeValue(draft.reminderAt)} onChange={e => setDraft({ ...draft, reminderAt: e.target.value ? localIso(e.target.value) : null })} /></label>
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
                  <button className="primary mobile-primary-action">Save task</button>
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

    {!draft&&<button className="home-task-fab" aria-label="New task" onClick={()=>{setTaskTitleError("");setDraft(blankTask())}}><Plus/><span>New task</span></button>}

    <nav className="mobile-nav" aria-label="Mobile navigation">
      {([["Home","/",House],["Capture","/capture",Tray],["Vault","/vault",Folder],["Calendar","/calendar",CalendarBlank],["Coding","/coding",Code]] as const).map(([label,href,Icon])=><Link className={label==="Home"?"active":""} href={href} key={label}><Icon/><span>{label}</span></Link>)}
    </nav>

    {palette&&<ModalDialog className="palette-dialog" onClose={closePalette}><div className="palette-search"><MagnifyingGlass/><input role="combobox" aria-expanded="true" aria-controls="palette-options" aria-activedescendant={paletteResults[activeIndex]?`palette-option-${paletteResults[activeIndex].id}`:undefined} autoFocus value={paletteQuery} onChange={event=>{setPaletteQuery(event.target.value);setPaletteActive(0)}} onKeyDown={event=>{if(event.key==="ArrowDown"){event.preventDefault();setPaletteActive(Math.min(activeIndex+1,paletteResults.length-1))}else if(event.key==="ArrowUp"){event.preventDefault();setPaletteActive(Math.max(activeIndex-1,0))}else if(event.key==="Enter"){event.preventDefault();paletteResults[activeIndex]?.run()}}} aria-label="Search commands" placeholder="Search Noema or run a command…"/></div><p aria-live="polite">Quick actions</p><div id="palette-options" role="listbox" aria-label="Quick actions">{paletteResults.map((item,index)=><button type="button" role="option" aria-selected={index===activeIndex} id={`palette-option-${item.id}`} key={item.id} onMouseEnter={()=>setPaletteActive(index)} onClick={item.run}><item.Icon/><span>{item.label}</span>{item.hint&&<kbd>{item.hint}</kbd>}</button>)}</div>{!paletteResults.length&&<p className="palette-empty" role="status">No commands match “{paletteQueryText?paletteQuery.trim():paletteQuery}”. Try a different word.</p>}<button type="button" className="icon-button palette-close" aria-label="Close search" onClick={closePalette}><X/></button></ModalDialog>}
    {handwriting&&<HandwritingCapture onClose={()=>setHandwriting(false)}/>}
    <ContextualAssistant
      isOpen={assistant}
      onClose={() => setAssistant(false)}
      active="Home"
      title="Home"
    />
  </div>;
}
