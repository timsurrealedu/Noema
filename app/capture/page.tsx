"use client";

import {useEffect, useMemo, useState, useRef, TouchEvent} from "react";
import Link from "next/link";
import {
  ArrowClockwise, ArrowLeft, ArrowRight, ArrowSquareOut, CalendarBlank, Check, CheckCircle, CheckSquare,
  CircleNotch, File, Globe, Keyboard, MagnifyingGlass, Microphone, Note, PenNib, Plus, Sparkle, Tray, WarningCircle, X
} from "@phosphor-icons/react";
import {Capture, CaptureObject, CaptureSource, useAppState} from "../components/AppState";
import {ModuleShell} from "../components/ModuleShell";

const filters = ["All", "Review", "Processing", "Done", "Dismissed"] as const;
type Filter = (typeof filters)[number];

const filterMeta = {
  All: { label: "All", Icon: Tray },
  Review: { label: "Review", Icon: Sparkle },
  Processing: { label: "Processing", Icon: CircleNotch },
  Done: { label: "Done", Icon: CheckCircle },
  Dismissed: {label:"Dismissed",Icon:X},
} as const;

const statusMeta = {
  queued: {label: "Queued", Icon: CircleNotch},
  processing: {label: "Processing", Icon: CircleNotch},
  review: {label: "Needs review", Icon: Sparkle},
  confirmed: {label: "Done", Icon: CheckCircle},
  failed: {label: "Failed", Icon: WarningCircle},
  dismissed: {label: "Dismissed", Icon: X},
} as const;

const sourceMeta: Record<CaptureSource, {label: string; Icon: typeof Keyboard}> = {
  typed: {label: "Typed", Icon: Keyboard},
  voice: {label: "Voice", Icon: Microphone},
  file: {label: "File", Icon: File},
  link: {label: "Web link", Icon: Globe},
  handwriting: {label: "Handwriting", Icon: PenNib},
};

function timeFor(value: string) {
  const date = new Date(value);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function shortTime(value: string) {
  const date = new Date(value);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

const localDateTime=(value?:string)=>value?new Date(value).toISOString().slice(0,16):"";
const isoDateTime=(value:string)=>value?new Date(value).toISOString():null;
function convertObject(object:CaptureObject,type:CaptureObject["type"],captureText:string,vaultSourceId?:string):CaptureObject{
  const title=object.title,args=object.arguments||{},start=object.type==="task"&&args.dueAt&&!/^\d{4}-\d{2}-\d{2}$/.test(args.dueAt)?args.dueAt:object.type==="event"?args.startAt:null;
  if(type==="task")return {...object,type,title,detail:start||"Inbox",arguments:{title,dueAt:start,project:"Inbox",linkedActionId:null}};
  if(type==="event")return {...object,type,title,detail:start||"Start and end required",arguments:{title,startAt:start,endAt:start?new Date(new Date(start).getTime()+3600000).toISOString():null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,location:null,reminders:[]}};
  if(type==="vault")return {...object,type,title,detail:`${title}.md`,arguments:{sourceId:vaultSourceId||"",relativePath:`${title}.md`,title,content:captureText,tags:[]}};
  return {...object,type,title,detail:captureText.slice(0,140),arguments:{title,content:captureText,tags:[]}};
}

function formatFriendlyTime(rawText: string): string {
  if (!rawText) return "";
  const isoRegex = /\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?:\:\d{2})?(?:\.\d+)?Z?)?\b/g;
  return rawText.replace(isoRegex, match => {
    const d = new Date(match);
    if (isNaN(d.getTime())) return match;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const hasTime = match.includes("T");
    const timeStr = hasTime
      ? d.toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit", hour12: true})
      : "";

    if (diffDays === 0) {
      return timeStr ? `today ${timeStr}` : "today";
    }
    if (diffDays === 1) {
      return timeStr ? `tomorrow ${timeStr}` : "tomorrow";
    }
    if (diffDays === -1) {
      return timeStr ? `yesterday ${timeStr}` : "yesterday";
    }

    const dateStr = d.toLocaleDateString("en-US", {month: "short", day: "numeric"});
    return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
  });
}

function formatErrorInfo(error?: string): { title: string; subtitle: string; isRateLimit: boolean } {
  if (!error) {
    return {
      title: "Processing failed",
      subtitle: "AI request timed out or was interrupted.",
      isRateLimit: false,
    };
  }
  const low = error.toLowerCase();
  if (low.includes("429") || low.includes("quota") || low.includes("rate limit") || low.includes("resource_exhausted") || low.includes("exceeded your current quota")) {
    return {
      title: "AI provider rate limited",
      subtitle: "Gemini rate limit exceeded. Try again later or switch provider.",
      isRateLimit: true,
    };
  }
  if (low.includes("500") || low.includes("502") || low.includes("503") || low.includes("504") || low.includes("unavailable") || low.includes("overloaded")) {
    return {
      title: "Provider unavailable",
      subtitle: "The AI service is temporarily unavailable or overloaded.",
      isRateLimit: false,
    };
  }
  if (low.includes("fetch failed") || low.includes("network") || low.includes("econnrefused") || low.includes("offline")) {
    return {
      title: "Network request failed",
      subtitle: "Could not reach the server or external AI service.",
      isRateLimit: false,
    };
  }
  if (low.includes("json") || low.includes("schema") || low.includes("parse") || low.includes("syntaxerror")) {
    return {
      title: "Invalid provider response",
      subtitle: "The AI response could not be parsed into structured objects.",
      isRateLimit: false,
    };
  }
  return {
    title: "Processing failed",
    subtitle: "AI processing encountered an unexpected error.",
    isRateLimit: false,
  };
}

function matches(capture: Capture, filter: Filter) {
  if (filter === "All") return capture.status !== "dismissed";
  if (filter === "Review") return capture.status === "review";
  if (filter === "Processing") return capture.status === "queued" || capture.status === "processing";
  if (filter === "Done") return capture.status === "confirmed";
  if (filter === "Dismissed") return capture.status === "dismissed";
  return true;
}

function formatProposalSummary(capture: Capture): string {
  if (capture.handwriting) {
    return `Handwriting processing complete · ${capture.handwriting.folder || "Vault"}`;
  }
  if (!capture.objects || capture.objects.length === 0) {
    if (capture.status === "processing" || capture.status === "queued") {
      return capture.status === "queued" ? "Queued for interpretation…" : "Interpreting…";
    }
    if (capture.status === "failed") {
      const errInfo = formatErrorInfo(capture.error);
      return `Failed · ${errInfo.title}`;
    }
    return "No structured objects detected";
  }

  const tasks = capture.objects.filter(o => o.type === "task");
  const events = capture.objects.filter(o => o.type === "event");
  const notes = capture.objects.filter(o => o.type === "note" || o.type === "vault");

  const parts: string[] = [];

  if (tasks.length > 0) {
    if (tasks.length === 1) {
      const task = tasks[0];
      const detailStr = task.detail && task.detail !== "No due date" ? formatFriendlyTime(task.detail) : "";
      const detail = detailStr ? ` · Due ${detailStr}` : "";
      parts.push(`1 task${detail}`);
    } else {
      parts.push(`${tasks.length} tasks`);
    }
  }

  if (events.length > 0) {
    if (events.length === 1) {
      const ev = events[0];
      const detailStr = ev.detail ? formatFriendlyTime(ev.detail) : "";
      const detail = detailStr ? ` · ${detailStr}` : "";
      parts.push(`1 event${detail}`);
    } else {
      parts.push(`${events.length} events`);
    }
  }

  if (notes.length > 0) {
    if (notes.length === 1) {
      const note = notes[0];
      const detailStr = note.type === "vault" && note.detail
        ? ` → ${note.detail}`
        : note.detail && note.detail !== "No due date" ? formatFriendlyTime(note.detail) : "";
      const detail = detailStr ? ` · ${detailStr}` : "";
      parts.push(`1 note${detail}`);
    } else {
      parts.push(`${notes.length} notes`);
    }
  }

  return parts.join(" · ");
}

function getAmbiguities(capture: Capture): string[] {
  const list: string[] = [...(capture.clarifications || [])];
  if (capture.objects) {
    for (const obj of capture.objects) {
      if (obj.confidence !== undefined && obj.confidence < 0.8) {
        list.push(`Low confidence (${Math.round(obj.confidence * 100)}%) on "${obj.title}"`);
      }
      if (obj.detail && (obj.detail.includes("tomorrow") || obj.detail.includes("next") || obj.detail.includes(":"))) {
        const timeMatch = obj.detail.match(/(\w+\s+\d+(?::\d+)?(?:\s*[ap]m)?)/i);
        if (timeMatch) {
          list.push(`"${timeMatch[1]}" interpreted as ${formatFriendlyTime(obj.detail)}`);
        }
      }
    }
  }
  return list;
}

type TranscriptSegment={start:number;end:number;text:string;label?:string};
type AudioTranscript={state:string;content:string;segments:TranscriptSegment[];provider:string|null;model:string|null;error:string|null}|null;

function TranscriptPanel({capture}: {capture: Capture}) {
  const {saveNote} = useAppState();
  const [transcript, setTranscript] = useState<AudioTranscript>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const assetId = capture.assets?.find(asset => asset.mime.startsWith("audio/"))?.id;
  const hasAudio = capture.source === "voice" || !!assetId;

  useEffect(() => {
    setLoaded(false);
    setTranscript(null);
    if (!capture.id || !hasAudio) return;
    let cancelled = false, attempts = 0;
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/captures/${capture.id}/transcribe`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setTranscript(data.transcript);
        setLoaded(true);
        if (data.transcript?.state === "queued" && attempts++ < 120) setTimeout(poll, 3000);
      } catch {}
    };
    void poll();
    return () => { cancelled = true; };
  }, [capture.id, hasAudio]);

  async function request() {
    if (!hasAudio) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/captures/${capture.id}/transcribe`, {method: "POST"});
      setLoaded(false);
    } finally { setBusy(false); }
  }

  function seek(segment: TranscriptSegment) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = segment.start;
    void audio.play();
  }

  async function summarizeIntoNote() {
    if (!transcript?.content) return;
    setBusy(true);
    try {
      const note = {
        id: `${Date.now()}-voice`,
        title: `Lecture notes · ${new Date(capture.createdAt).toLocaleDateString()}`,
        content: `# Lecture notes\n\n${transcript.content}`,
        tags: ["lecture", "study"],
        time: "Now",
        ai: true,
        source: "Voice transcript",
        excerpt: transcript.content.slice(0, 140)
      };
      saveNote(note);
      await fetch(`/api/v1/notes/${note.id}/optimizations`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({mode: "study"})
      });
      location.assign(`/vault?open=${encodeURIComponent(note.id)}`);
    } finally { setBusy(false); }
  }

  if (!hasAudio) return null;
  return (
    <section className="transcript-panel" aria-label="Audio transcription">
      <h3>Transcript</h3>
      {assetId && <audio ref={audioRef} controls preload="metadata" src={`/api/v1/assets/${assetId}`} aria-label="Recording playback"/>}
      {!loaded && !busy && <p className="status-label">Checking transcription…</p>}
      {loaded && !transcript && (
        <button className="secondary" disabled={busy} onClick={() => void request()}>
          <Microphone />{busy ? "Queued…" : "Transcribe recording"}
        </button>
      )}
      {loaded && transcript?.state === "queued" && (
        <p className="status-label"><CircleNotch className="spin" /> Transcribing the lecture…</p>
      )}
      {loaded && transcript?.state === "failed" && (
        <div>
          <p className="status-label error">{transcript.error || "Transcription failed."}</p>
          <button className="secondary" onClick={() => void request()}><ArrowClockwise /> Retry</button>
        </div>
      )}
      {loaded && transcript?.state === "complete" && (
        <>
          {transcript.segments.length > 0 ? (
            <ol className="transcript-segments">
              {transcript.segments.map((segment, index) => (
                <li key={index}>
                  <button type="button" className="transcript-segment" onClick={() => seek(segment)}>
                    <time>{segment.label}</time><span>{segment.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : <p className="transcript-text">{transcript.content}</p>}
          <button className="primary" disabled={busy} onClick={() => void summarizeIntoNote()}>
            <Sparkle />Summarize into study note
          </button>
          <small>{transcript.provider}{transcript.model ? ` · ${transcript.model}` : ""}</small>
        </>
      )}
    </section>
  );
}

export default function CaptureInbox() {
  const {addCapture, cancelInterpretation, captures, confirmCapture, projects, requestInterpretation, saveCaptureProposal, updateCapture} = useAppState();
  const [filter, setFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const didReadParams = useRef(false);
  const visible = useMemo(() => {
    return captures.filter(item => {
      if (!matches(item, filter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = item.text.toLowerCase().includes(q);
        const sourceMatch = item.source.toLowerCase().includes(q);
        const statusMatch = item.status.toLowerCase().includes(q);
        const objectMatch = item.objects?.some(o => o.title.toLowerCase().includes(q) || o.detail.toLowerCase().includes(q));
        return textMatch || sourceMatch || statusMatch || objectMatch;
      }
      return true;
    });
  }, [captures, filter, searchQuery]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState<{id: string; message: string; previous: Capture["status"]} | null>(null);
  const [processingInbox, setProcessingInbox] = useState(false);
  const [selectedActions,setSelectedActions]=useState<Set<string>>(new Set());
  const [editing,setEditing]=useState<{index:number;object:CaptureObject}|null>(null);
  const [instruction,setInstruction]=useState("");
  const [vaultSources,setVaultSources]=useState<{id:string;name:string}[]>([]);
  const didAutoProcess = useRef(false);
  const hasPending = captures.some(item => item.status === "queued");
  const selected = visible.find(item => item.id === selectedId) ?? visible[0];

  useEffect(()=>{setSelectedActions(new Set((selected?.objects||[]).map(object=>object.id).filter((id):id is string=>!!id)));setEditing(null);setInstruction("")},[selected?.id,selected?.version]);
  useEffect(()=>{fetch("/api/v1/vault-sources").then(response=>response.ok?response.json():null).then(result=>setVaultSources(result?.sources||[])).catch(()=>{})},[]);

  async function runProcessPending() {
    setProcessingInbox(true);
    try {
      await fetch("/api/v1/captures/process-pending", {method: "POST"});
    } catch {}
    finally { setProcessingInbox(false); }
  }

  useEffect(() => {
    if (didAutoProcess.current) return;
    if (!hasPending) return;
    didAutoProcess.current = true;
    void runProcessPending();
  }, [hasPending]);

  useEffect(() => {
    if (didReadParams.current) return;
    didReadParams.current = true;
    const params = new URLSearchParams(location.search);
    const savedFilter = params.get("filter");
    if (savedFilter && filters.includes(savedFilter as Filter)) setFilter(savedFilter as Filter);
    setSearchQuery(params.get("q") || "");
    const open = params.get("open");
    const shared = [params.get("title"), params.get("text"), params.get("url")].filter(Boolean).join("\n");
    if (open && captures.some(item => item.id === open)) {
      setFilter("All");
      setSelectedId(open);
      setDetailOpen(true);
    } else if (shared) {
      setSelectedId(addCapture(shared));
      history.replaceState(null, "", "/capture");
    }
  }, [captures]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (filter === "All") params.delete("filter"); else params.set("filter", filter);
    if (searchQuery) params.set("q", searchQuery); else params.delete("q");
    history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function choose(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function changeStatus(capture: Capture, status: Capture["status"], message: string) {
    updateCapture(capture.id, status);
    setToast({id: capture.id, message, previous: capture.status});
    if (status === "dismissed") {
      setSelectedId(null);
      setDetailOpen(false);
    }
  }

  function retry(capture: Capture) {
    setFilter("All");
    setSelectedId(capture.id);
    requestInterpretation(capture.id);
    setToast({id: capture.id, message: "Processing started again", previous: "failed"});
  }

  function confirm(capture: Capture) {
    if (!capture.objects.length) {
      changeStatus(capture, "confirmed", "Capture confirmed");
      return;
    }
    void confirmCapture(capture.id,[...selectedActions]);
    setToast({id: capture.id, message: "Capture confirmed and objects created", previous: capture.status});
  }

  function toggleAction(object:CaptureObject){if(!object.id)return;const linked=object.arguments?.linkedActionId as string|undefined,linkedFrom=selected?.objects.find(item=>item.arguments?.linkedActionId===object.id)?.id,ids=[object.id,linked,linkedFrom].filter((id):id is string=>!!id);setSelectedActions(current=>{const next=new Set(current),select=!current.has(object.id!);for(const id of ids)select?next.add(id):next.delete(id);return next})}
  async function saveEdit(){if(!selected||!editing)return;const objects=selected.objects.map((object,index)=>index===editing.index?editing.object:object);await saveCaptureProposal(selected.id,objects);setEditing(null)}

  function undo() {
    if (!toast) return;
    updateCapture(toast.id, toast.previous);
    setSelectedId(toast.id);
    setToast(null);
  }

  const touchStartRef = useRef<{x: number; y: number; time: number} | null>(null);

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    // Ignore swipes that started inside a capture card
    if (e.target instanceof Element && e.target.closest(".capture-card")) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    const deltaTime = Date.now() - start.time;

    if (deltaTime < 500 && Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = filters.indexOf(filter);
      if (deltaX < 0 && currentIndex < filters.length - 1) {
        setFilter(filters[currentIndex + 1]);
        setSelectedId(null);
      } else if (deltaX > 0 && currentIndex > 0) {
        setFilter(filters[currentIndex - 1]);
        setSelectedId(null);
      }
    }
  }

  return (
    <ModuleShell active="Capture" title="Capture inbox" action={<Link className="primary top-primary" href="/#capture"><Plus/>Quick capture</Link>}>
      <div className={`capture-inbox ${detailOpen ? "detail-open" : ""}`}>
        <section
          className="capture-list-pane"
          aria-label="Capture inbox"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="capture-queue-toolbar">
            <div className="capture-search-wrap">
              <MagnifyingGlass />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search text, files, status..."
                aria-label="Search captures"
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <X />
                </button>
              )}
            </div>
            {hasPending && (
              <button className="secondary process-inbox-btn" disabled={processingInbox} onClick={() => void runProcessPending()} aria-label="Process pending handwriting">
                <Sparkle />{processingInbox ? "Processing…" : "Process inbox"}
              </button>
            )}
            <div className="capture-filters" role="tablist" aria-label="Capture status">
              {filters.map(item => {
                const count = item === "All"
                  ? captures.filter(c => c.status !== "dismissed").length
                  : captures.filter(c => matches(c, item)).length;
                const Meta = filterMeta[item];
                const Icon = Meta.Icon;
                const isDone = item === "Done";
                return (
                  <button
                    key={item}
                    role="tab"
                    title={item}
                    aria-label={`${item} (${count})`}
                    aria-selected={filter === item}
                    className={`tab-filter-btn tab-${item.toLowerCase()} ${filter === item ? "active" : ""}`}
                    onClick={() => {
                      setFilter(item);
                      setSelectedId(null);
                    }}
                  >
                    {isDone ? (
                      <Icon className="tab-icon" />
                    ) : (
                      <span className="tab-label">{item}</span>
                    )}
                    <span className="tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {visible.length ? (
            <div className="capture-groups">
              <div className="capture-rows">
                {visible.map(capture => (
                  <CaptureRow
                    capture={capture}
                    selected={selected?.id === capture.id}
                    onSelect={() => choose(capture.id)}
                    onRetry={() => retry(capture)}
                    onConfirm={() => confirm(capture)}
                    onDismiss={() => changeStatus(capture, "dismissed", "Capture dismissed")}
                    onUndo={() => updateCapture(capture.id, "review")}
                    key={capture.id}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="capture-empty">
              <CheckCircle />
              <h3>{filter === "All" ? "Inbox clear" : `No ${filter.toLowerCase()} captures`}</h3>
              <p>
                {filter === "All"
                  ? "New captures will appear here with their source and interpretation."
                  : "Choose another status to keep reviewing your inbox."}
              </p>
              {filter === "All" ? (
                <Link className="primary capture-primary-action" href="/#capture">
                  <Plus />Quick capture
                </Link>
              ) : (
                <button className="secondary" onClick={() => { setFilter("All"); setSearchQuery(""); }}>
                  Show all captures
                </button>
              )}
            </div>
          )}
        </section>

        <aside className="capture-inspector" aria-label="Capture details">
          {selected ? (
            <>
              <header className="inspector-head">
                <button className="icon-button mobile-detail-back" aria-label="Back to capture list" onClick={() => setDetailOpen(false)}>
                  <ArrowLeft />
                </button>
                <div>
                  <span>Original capture</span>
                  <time>{timeFor(selected.createdAt)}</time>
                </div>
                <span className={`capture-source ${selected.source}`}>
                  <SourceIcon source={selected.source} />
                  {sourceMeta[selected.source].label}
                </span>
              </header>

              <div className="original-capture">
                <p>{selected.text}</p>
                <span>{selected.sourceLabel}</span>
              </div>

              {getAmbiguities(selected).length > 0 && (
                <section className="ambiguity-callout" role="note">
                  <Sparkle />
                  <div>
                    <strong>Interpretation ambiguity</strong>
                    {getAmbiguities(selected).map((msg, i) => (
                      <p key={i}>{msg}</p>
                    ))}
                  </div>
                </section>
              )}

              {(selected.status === "queued" || selected.status === "processing") && (
                <section className="processing-panel" aria-live="polite">
                  <CircleNotch className="spin" />
                  <div>
                    <strong>{selected.status === "queued" ? "Queued for processing" : "Interpreting this capture"}</strong>
                    <span>{selected.status === "queued" ? "The original ink is safely stored and waiting for Process Inbox." : "Reading the source and identifying useful objects."}</span>
                    <i aria-hidden="true"><b /></i>
                  </div>
                  {selected.jobId && (
                    <button className="secondary" onClick={() => cancelInterpretation(selected.id)}>Cancel</button>
                  )}
                </section>
              )}

              {selected.status === "failed" && (() => {
                const errInfo = formatErrorInfo(selected.error);
                return (
                  <section className="failed-inspector-details">
                    <section className="interpretation-head">
                      <div>
                        <WarningCircle style={{color: "var(--error)"}} />
                        <span>
                          <strong>Processing failed</strong>
                          <small>{errInfo.title}</small>
                        </span>
                      </div>
                      <span className="capture-status status-failed">
                        <WarningCircle /> Failed
                      </span>
                    </section>

                    <section className="attempted-objects-section">
                      <h3>What Noema tried to do</h3>
                      {selected.objects && selected.objects.length > 0 ? (
                        <div className="detected-objects">
                          {selected.objects.map((object, index) => (
                            <article key={`${object.type}-${index}`}>
                              <span className={`object-icon ${object.type}`}>
                                {object.type === "task" ? <CheckSquare /> : object.type === "event" ? <CalendarBlank /> : <Note />}
                              </span>
                              <div>
                                <small>{object.type === "vault" ? "Vault note" : object.type}</small>
                                <strong>{object.title}</strong>
                                <p>{object.type === "vault" && object.detail && object.detail !== object.title ? `→ ${object.detail}` : formatFriendlyTime(object.detail)}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="no-proposal-text">No proposal generated prior to failure.</p>
                      )}
                    </section>

                    <section className="failure-panel" role="alert">
                      <WarningCircle />
                      <div className="failure-copy">
                        <strong>{errInfo.title}</strong>
                        <p>{errInfo.subtitle}</p>
                        {selected.error && (
                          <details className="tech-details-disclosure">
                            <summary>View technical details</summary>
                            <pre className="raw-error-text">{selected.error}</pre>
                          </details>
                        )}
                      </div>
                    </section>

                    <footer className="inspector-actions">
                      {errInfo.isRateLimit && (
                        <Link className="secondary" href="/settings">
                          Switch provider
                        </Link>
                      )}
                      <button className="primary capture-primary-action" onClick={() => retry(selected)}>
                        <ArrowClockwise /> Try again
                      </button>
                    </footer>
                  </section>
                );
              })()}

              {selected.status === "confirmed" && selected.handwriting && (
                <section className="handwriting-result">
                  <div className="interpretation-head">
                    <div>
                      <Sparkle />
                      <span>
                        <strong>{selected.handwriting.title}</strong>
                        <small>Handwriting processing complete.</small>
                      </span>
                    </div>
                    <span className="capture-status status-confirmed">
                      <CheckCircle />Done
                    </span>
                  </div>
                  <dl>
                    <div><dt>Folder</dt><dd>{selected.handwriting.folder}</dd></div>
                    <div><dt>AI action</dt><dd>{selected.handwriting.action || "None"}</dd></div>
                    <div><dt>Confidence</dt><dd>{selected.handwriting.confidence === null ? "Not applicable" : `${Math.round(selected.handwriting.confidence * 100)}%`}</dd></div>
                    <div><dt>Source ink</dt><dd>Editable · {selected.handwriting.inkBlockId}</dd></div>
                  </dl>
                  <a className="primary" href={`/vault?open=${selected.handwriting.noteId}`}>
                    Open note<ArrowSquareOut />
                  </a>
                </section>
              )}

              {(selected.status === "review" || selected.status === "dismissed" || (selected.status === "processing" && selected.objects.length > 0) || (selected.status === "confirmed" && !selected.handwriting)) && (
                <>
                  <section className="interpretation-head">
                    <div>
                      <Sparkle />
                      <span>
                        <strong>Interpretation</strong>
                        <small>
                          {selected.status === "review"
                            ? selected.objects.length > 0
                              ? "Check the detected objects before confirming."
                              : "No structured objects (tasks/events) detected in this capture."
                            : selected.status === "dismissed"
                            ? "Archived without creating objects. The latest proposal is preserved."
                            : selected.objects.length > 0
                            ? "This interpretation has been confirmed."
                            : "Confirmed as a preserved raw capture."}
                        </small>
                      </span>
                    </div>
                    <span className={`capture-status status-${selected.status}`}>
                      <StatusIcon capture={selected} />
                      {statusMeta[selected.status].label}
                    </span>
                  </section>

                  <section className="detected-objects" aria-labelledby="detected-title">
                    <h3 id="detected-title">
                      {selected.status === "confirmed" ? "Created objects" : "What Noema understood"} <span>{selected.objects.length}</span>
                    </h3>
                    {selected.objects.map((object, index) => editing?.index===index ? (
                      <article className="proposal-editor" key={object.id||index}>
                        <div className="proposal-edit-fields">
                          <label>Object type<select value={editing.object.type} onChange={event=>setEditing({index,object:convertObject(editing.object,event.target.value as CaptureObject["type"],selected.text,vaultSources[0]?.id)})}><option value="task">Task</option><option value="event">Event</option><option value="note">Note</option><option value="vault" disabled={!vaultSources.length}>Vault note</option></select></label>
                          <label>Title<input value={editing.object.title} onChange={event=>setEditing({index,object:{...editing.object,title:event.target.value,arguments:{...editing.object.arguments,title:event.target.value}}})}/></label>
                          {editing.object.type==="task"&&<><label>Due date/time<input type="datetime-local" value={localDateTime(editing.object.arguments?.dueAt)} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,dueAt:isoDateTime(event.target.value)}}})}/></label><label>Project<select value={editing.object.arguments?.project||"Inbox"} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,project:event.target.value}}})}><option>Inbox</option>{projects.map(project=><option key={project.id}>{project.name}</option>)}</select></label></>}
                          {editing.object.type==="event"&&<><label>Start<input required type="datetime-local" value={localDateTime(editing.object.arguments?.startAt)} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,startAt:isoDateTime(event.target.value)}}})}/></label><label>End<input required type="datetime-local" value={localDateTime(editing.object.arguments?.endAt)} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,endAt:isoDateTime(event.target.value)}}})}/></label><label>Timezone<input value={editing.object.arguments?.timezone||""} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,timezone:event.target.value}}})}/></label><label>Location<input value={editing.object.arguments?.location||""} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,location:event.target.value||null}}})}/></label><label>Reminders (minutes)<input value={(editing.object.arguments?.reminders||[]).map((item:{offsetMinutes:number})=>item.offsetMinutes).join(", ")} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,reminders:event.target.value.split(",").map(value=>Number(value.trim())).filter(Number.isInteger).map(offsetMinutes=>({offsetMinutes}))}}})}/></label></>}
                          {(editing.object.type==="note"||editing.object.type==="vault")&&<><label>Markdown<textarea rows={7} value={editing.object.arguments?.content||""} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,content:event.target.value}}})}/></label><label>Tags<input value={(editing.object.arguments?.tags||[]).join(", ")} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,tags:event.target.value.split(",").map(value=>value.trim()).filter(Boolean)}}})}/></label></>}
                          {editing.object.type==="vault"&&<><label>Vault<select value={editing.object.arguments?.sourceId||""} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,sourceId:event.target.value}}})}>{vaultSources.map(source=><option value={source.id} key={source.id}>{source.name}</option>)}</select></label><label>Markdown path<input value={editing.object.arguments?.relativePath||""} onChange={event=>setEditing({index,object:{...editing.object,arguments:{...editing.object.arguments,relativePath:event.target.value}}})}/></label></>}
                          <div className="proposal-edit-actions"><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="primary" onClick={()=>void saveEdit()}>Save</button></div>
                        </div>
                      </article>
                    ) : (
                      <article key={object.id||`${object.type}-${index}`} className={!selectedActions.has(object.id||"")&&selected.status==="review"?"proposal-unselected":""}>
                        {selected.status==="review"&&<input type="checkbox" aria-label={`Select ${object.title}`} checked={selectedActions.has(object.id||"")} onChange={()=>toggleAction(object)}/>}
                        <span className={`object-icon ${object.type}`}>
                          {object.type === "task" ? <CheckSquare /> : object.type === "event" ? <CalendarBlank /> : <Note />}
                        </span>
                        <div>
                          <small>{object.type === "vault" ? "Vault note" : object.type}{object.userEdited?" · Edited by you":""}</small>
                          <strong>{object.title}</strong>
                          <p>{object.type === "vault" && object.detail && object.detail !== object.title ? `→ ${object.detail}` : formatFriendlyTime(object.detail)}</p>
                        </div>
                        {selected.status==="review"?<button className="secondary proposal-edit-button" onClick={()=>setEditing({index,object:structuredClone(object)})}>Edit</button>:<CheckCircle aria-label="Created" />}
                      </article>
                    ))}
                  </section>

                  {(selected.status==="review"||selected.status==="processing")&&<section className="proposal-revision"><label htmlFor="proposal-instruction">Answer a clarification or tell Noema what to change.</label><textarea id="proposal-instruction" maxLength={2000} value={instruction} disabled={selected.status==="processing"} onChange={event=>setInstruction(event.target.value)} placeholder="For example: make this an event tomorrow at 3 PM, or split it into two tasks."/><button className="secondary" disabled={!instruction.trim()||!!editing||selected.status==="processing"} onClick={()=>void requestInterpretation(selected.id,instruction.trim())}><Sparkle/>Revise proposal</button></section>}

                  <section className="source-relationship">
                    <h3>Source relationship</h3>
                    <div>
                      <SourceIcon source={selected.source} />
                      <span>
                        <strong>Original source preserved</strong>
                        <small>{selected.sourceLabel}</small>
                      </span>
                      <Check />
                    </div>
                    {selected.assets?.map(asset => (
                      <div key={asset.id}>
                        <File />
                        <span>
                          <strong>{asset.name}</strong>
                          <small>
                            {asset.mime} · {asset.size > 1048576 ? `${(asset.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(asset.size / 1024))} KB`}
                          </small>
                        </span>
                        <span className="capture-asset-actions">
                          {asset.mime==="application/pdf"&&<Link className="row-action" href={`/assets/${asset.id}/annotate`} aria-label={`Annotate ${asset.name}`}><PenNib/></Link>}
                          <a className="row-action" href={`/api/v1/assets/${asset.id}`} target="_blank" rel="noreferrer" aria-label={`Open original ${asset.name}`}><ArrowSquareOut/></a>
                        </span>
                      </div>
                    ))}
                  </section>

                  <TranscriptPanel capture={selected}/>
                </>
              )}

              {selected.status !== "failed" && (
                <footer className="inspector-actions">
                  {selected.status === "review" && (
                    <>
                      <button className="secondary" disabled={!!editing} onClick={() => changeStatus(selected, "dismissed", "Capture archived")}>
                        Archive capture
                      </button>
                      {selected.objects.length === 0 && (
                        <button className="secondary" onClick={() => requestInterpretation(selected.id)}>
                          <Sparkle />Re-interpret
                        </button>
                      )}
                      <button className="primary capture-primary-action" disabled={!!editing||(selected.objects.length>0&&selectedActions.size===0)} onClick={() => confirm(selected)}>
                        <Check />{selected.objects.length === 0 ? "Keep as raw note" : `Confirm selected (${selectedActions.size})`}
                      </button>
                    </>
                  )}
                  {selected.status === "confirmed" && (
                    <>
                      <button className="secondary" onClick={() => requestInterpretation(selected.id)}>
                        <Sparkle />Re-interpret
                      </button>
                      <button className="secondary" onClick={() => changeStatus(selected, "review", "Capture reopened for review")}>
                        Reopen review
                      </button>
                    </>
                  )}
                </footer>
              )}
            </>
          ) : (
            <div className="inspector-empty">
              <Sparkle />
              <h3>Select a capture</h3>
              <p>Its source, interpretation, and actions will appear here.</p>
            </div>
          )}
        </aside>
      </div>

      <div className="mobile-action-dock capture-mobile-dock">
        <Link href="/#capture" className="primary" aria-label="Quick capture">
          <Plus weight="bold" /> Quick capture
        </Link>
      </div>

      {toast && (
        <div className="undo-toast" role="status">
          <CheckCircle />
          <span>{toast.message}</span>
          <button onClick={undo}>Undo</button>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X />
          </button>
        </div>
      )}
    </ModuleShell>
  );
}

function SourceIcon({source}: {source: CaptureSource}) {
  const Icon = sourceMeta[source].Icon;
  return <Icon />;
}

function StatusIcon({capture}: {capture: Capture}) {
  const Icon = statusMeta[capture.status].Icon;
  return <Icon className={capture.status === "processing" ? "spin" : ""} />;
}

function CaptureRow({
  capture,
  selected,
  onSelect,
  onRetry,
  onConfirm,
  onDismiss,
  onUndo,
}: {
  capture: Capture;
  selected: boolean;
  onSelect: () => void;
  onRetry: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  const summary = formatProposalSummary(capture);
  const ambiguities = getAmbiguities(capture);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  function handleTouchStart(e: TouchEvent) {
    e.stopPropagation();
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
  }

  function handleTouchMove(e: TouchEvent) {
    e.stopPropagation();
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsSwiping(true);
      // Clamp to ±96px with rubber band
      const clamped = Math.max(-96, Math.min(96, deltaX));
      const rubberBand = deltaX - clamped;
      setSwipeOffset(clamped + rubberBand * 0.15);
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    e.stopPropagation();
    if (swipeOffset > 80 && capture.status === "review") {
      onConfirm();
    } else if (swipeOffset < -80 && capture.status === "review") {
      onDismiss();
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  }

  return (
    <article
      className={`capture-card capture-card-${capture.status} ${selected ? "selected" : ""} ${isSwiping ? "swiping" : ""}`}
      style={swipeOffset !== 0 ? {transform: `translateX(${swipeOffset}px)`} : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onSelect}
      onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect()}}}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${capture.text}. ${statusMeta[capture.status].label}. Open capture`}
    >
      <div className="card-top">
        <strong className="card-title">{capture.text}</strong>
        <span className="card-meta">
          <SourceIcon source={capture.source} />
          {sourceMeta[capture.source].label} · <time dateTime={capture.createdAt}>{shortTime(capture.createdAt)}</time>
        </span>
      </div>

      {capture.status === "review" && (
        <div className="card-body card-body-review">
          <div className="proposed-section">
            <span className="section-tag">Proposed</span>
            <p className="summary-text">{summary}</p>
          </div>
          {ambiguities.length > 0 && (
            <span className="ambiguity-badge" title={ambiguities.join(", ")}>
              Needs review · {ambiguities.length} ambiguity
            </span>
          )}
          <span className="review-action" aria-label="Review capture">
            Review <ArrowRight />
          </span>
        </div>
      )}

      {(capture.status === "queued" || capture.status === "processing") && (
        <div className="card-body card-body-processing">
          <span className="status-label">
            <CircleNotch className="spin" /> {capture.status === "queued" ? "Queued…" : "Interpreting…"}
          </span>
          <i className="progress-bar" aria-hidden="true">
            <b />
          </i>
        </div>
      )}

      {capture.status === "failed" && (() => {
        const errInfo = formatErrorInfo(capture.error);
        return (
          <div className="card-body card-body-failed">
            <span className="status-label error" title={capture.error}>
              <WarningCircle /> Failed · {errInfo.title}
            </span>
            <button
              className="row-retry"
              onClick={e => {
                e.stopPropagation();
                onRetry();
              }}
            >
              <ArrowClockwise /> Retry
            </button>
          </div>
        );
      })()}

      {capture.status === "confirmed" && (
        <div className="card-body card-body-done">
          <span className="section-tag success">Created</span>
          <ul className="created-items">
            {capture.objects.length > 0 ? (
              capture.objects.map((obj, i) => (
                <li key={i}>
                  <CheckCircle className="check-icon" /> {obj.title}
                </li>
              ))
            ) : (
              <li>
                <CheckCircle className="check-icon" /> Preserved raw capture
              </li>
            )}
          </ul>
          <div className="done-actions">
            <button
              className="undo-btn"
              title="Reopen this capture for review — already created items are kept and must be removed manually"
              onClick={e => {
                e.stopPropagation();
                onUndo();
              }}
            >
              Reopen review
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
