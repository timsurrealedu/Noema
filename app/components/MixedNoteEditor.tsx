"use client";

import {createId} from "../lib/id";
import {useEffect,useMemo,useRef,useState} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowsIn,
  ArrowsOut,
  Broom,
  CaretDown,
  CaretUp,
  Copy,
  DotsThree,
  Eye,
  EyeSlash,
  HighlighterCircle,
  PencilLine,
  PenNib,
  Plus,
  TextT,
  Trash
} from "@phosphor-icons/react";
import {InkEditor} from "./InkEditor";
import {
  clampZoom,
  eraseAt,
  InkPoint,
  InkStroke,
  InkTool,
  sanitizeStrokes,
  strokePath,
  acceptInkPointer,
  penRecentlyUp
} from "../lib/ink";
import {MarkdownContent, extractTagsAndCleanText, StructuredTags} from "./MarkdownContent";
import {LiveMarkdownEditor} from "./LiveMarkdownEditor";

type Block = {
  id: string;
  position: number;
  kind: "markdown" | "ink";
  markdown: string;
  version: number;
  inkVersion?: number;
  width?: number;
  height?: number;
  strokes?: InkStroke[];
  transcript?: string;
  ocrStatus?: string;
  equations?: {latex: string; confidence: string}[];
  taskProposals?: {id: string; text: string; state: string}[];
};

type MathContinuation = {
  id: string;
  block_id: string;
  analysis: string;
  continuation: string;
  confidence: string | null;
  state: string;
  assumptions: string[];
};

async function requestMathContinuation(noteId: string, blockId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/v1/notes/${noteId}/continue-math`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({blockId}),
    signal
  });
  if (!response.ok && response.status !== 202) throw new Error((await response.json()).error?.message || "Could not queue math continuation");
}

export function MathContinuationCard({
  continuation,
  onDecide,
  busy
}: {
  continuation: MathContinuation;
  onDecide: (action: "accept" | "dismiss") => void;
  busy?: boolean;
}) {
  return (
    <section className="math-continuation-card" aria-label="Proposed math continuation">
      <header>
        <span><strong>AI proposed continuation</strong>{continuation.confidence && <small> · confidence {continuation.confidence}</small>}</span>
      </header>
      {continuation.analysis && <p className="math-continuation-analysis">{continuation.analysis}</p>}
      {continuation.assumptions.length > 0 && (
        <ul className="math-continuation-assumptions">
          {continuation.assumptions.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      )}
      <pre className="math-continuation-proposal">{continuation.continuation}</pre>
      <footer>
        <button type="button" className="secondary" disabled={busy} onClick={() => onDecide("dismiss")}>Dismiss</button>
        <button type="button" className="primary" disabled={busy} onClick={() => onDecide("accept")}>Insert as block</button>
      </footer>
    </section>
  );
}

function useMathContinuationFlow(noteId: string, blockId: string) {
  const [proposal, setProposal] = useState<MathContinuation | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => {}, []);
  async function request() {
    setBusy(true);
    try {
      await requestMathContinuation(noteId, blockId);
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await fetch(`/api/v1/notes/${noteId}/continue-math`);
        if (!response.ok) continue;
        const data = await response.json();
        const found = (data.continuations || []).find((item: MathContinuation) => item.block_id === blockId && item.state === "proposed");
        if (found) { setProposal(found); return; }
      }
    } finally {
      setBusy(false);
    }
  }
  async function decide(action: "accept" | "dismiss") {
    if (!proposal) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/notes/${noteId}/continue-math`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({continuationId: proposal.id, action})
      });
      setProposal(null);
    } finally {
      setBusy(false);
    }
  }
  return {proposal, busy, request, decide};
}

function MarkdownBlock({
  block,
  preview,
  onSave,
  onInsertInk,
  onNavigateNote
}: {
  block: Block;
  preview: boolean;
  onSave: (block: Block, value: string) => void;
  onInsertInk: (block: Block, value: string, caret: number) => void;
  onNavigateNote?: (target: string) => void;
}) {
  const [value, setValue] = useState(block.markdown);

  useEffect(() => {
    setValue(block.markdown);
  }, [block.markdown]);

  return (
    <div className="markdown-block-editor">
      {!preview ? (
        <LiveMarkdownEditor
          value={value}
          onChange={(val) => { setValue(val); onSave(block, val); }}
          onBlur={() => {}}
        />
      ) : (
        <article className="markdown-preview block-preview">
          <MarkdownContent text={value} onNavigateNote={onNavigateNote} />
        </article>
      )}
      <nav className="block-actions" aria-label={`Actions for block ${block.position + 1}`}>
        <button type="button" onClick={() => onInsertInk(block, value, value.length)} title="Insert a handwriting block after this block">Insert ink</button>
      </nav>
    </div>
  );
}

function InkBlockView({
  noteId,
  block,
  onMove,
  onDelete,
  onSaved
}: {
  noteId: string;
  block: Block;
  onMove: (block: Block, delta: number) => void;
  onDelete: (block: Block) => void;
  onSaved: () => void;
}) {
  const {proposal, busy, request, decide} = useMathContinuationFlow(noteId, block.id);
  return (
    <section className="note-block ink-note-block">
      <nav>
        <span>Ink</span>
        <button type="button" disabled={busy} onClick={() => void request()} aria-label="Continue math with AI">Continue math</button>
        <button type="button" onClick={() => onMove(block, -1)} aria-label="Move ink block up"><ArrowUp size={14} /></button>
        <button type="button" onClick={() => onMove(block, 1)} aria-label="Move ink block down"><ArrowDown size={14} /></button>
        <button type="button" onClick={() => onDelete(block)} aria-label="Delete ink block"><Trash size={14} /></button>
      </nav>
      {proposal && <MathContinuationCard continuation={proposal} busy={busy} onDecide={action => { void decide(action).then(() => { if (action === "accept") onSaved(); }); }} />}
      <InkEditor
        id={block.id}
        noteId={noteId}
        strokes={sanitizeStrokes(block.strokes)}
        version={block.inkVersion || 0}
        transcript={block.transcript || ""}
        ocrStatus={block.ocrStatus || "pending"}
        onSaved={onSaved}
      />
    </section>
  );
}

function IntegratedOverlayCanvas({
  width,
  height,
  strokes,
  activeTool,
  color,
  size,
  interactive,
  visible = true,
  zoomRef,
  onChange
}: {
  width: number;
  height: number;
  strokes: InkStroke[];
  activeTool: InkTool;
  color: string;
  size: number;
  interactive: boolean;
  visible?: boolean;
  zoomRef?: {current: number};
  onChange: (nextStrokes: InkStroke[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const activeStroke = useRef<InkStroke | null>(null);
  const [currentStrokes, setCurrentStrokes] = useState<InkStroke[]>(strokes);
  const [penDrawing, setPenDrawing] = useState(false);
  const liveStrokes = useRef<InkStroke[]>(strokes);
  const penActive = useRef(false);
  const penUpAt = useRef(0);
  const touchCount = useRef(0);

  useEffect(() => {
    setCurrentStrokes(strokes);
    liveStrokes.current = strokes;
  }, [strokes]);

  if (!visible) return null;

  function getPoint(event: {clientX:number;clientY:number;pressure:number;pointerType:string;timeStamp:number;tiltX:number;tiltY:number}): InkPoint | null {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = zoomRef?.current || 1;
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)) / scale,
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) / scale,
      pressure: event.pressure > 0 ? event.pressure : event.pointerType === "pen" ? 0.5 : 1,
      time: event.timeStamp,
      tiltX: Number(event.tiltX) || 0,
      tiltY: Number(event.tiltY) || 0
    };
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!interactive) return;

    // Pen gate: reject touch if pen was recently active (palm rejection)
    if (event.pointerType === "touch") {
      if (penRecentlyUp(event.pointerType, penActive.current, penUpAt.current)) return;
      touchCount.current++;
      return;
    }
    if (!acceptInkPointer(event.pointerType, penActive.current)) return;
    if (event.pointerType === "pen") penActive.current = true;

    const pt = getPoint(event);
    if (!pt) return;
    drawing.current = true;
    if (event.pointerType === "pen") setPenDrawing(true);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

    if (activeTool === "eraser") {
      const erased = eraseAt(liveStrokes.current, pt, size * 4);
      liveStrokes.current = erased;
      setCurrentStrokes(erased);
      onChange(erased);
      return;
    }

    const tool = activeTool === "highlighter" ? "highlighter" : "pen";
    const stroke: InkStroke = {
      id: createId(),
      tool,
      color,
      width: size,
      points: [pt]
    };
    activeStroke.current = stroke;
    liveStrokes.current = [...liveStrokes.current, stroke];
    setCurrentStrokes(liveStrokes.current);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current || !interactive) return;

    // Two-finger scroll: pass through
    if (event.pointerType === "touch") {
      touchCount.current = Math.max(touchCount.current, event.isPrimary ? 1 : 2);
      return;
    }

    const pt = getPoint(event);
    if (!pt) return;

    if (activeTool === "eraser") {
      const erased = eraseAt(liveStrokes.current, pt, size * 4);
      liveStrokes.current = erased;
      setCurrentStrokes(erased);
      return;
    }

    if (activeStroke.current) {
      const points = (event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent]).map(item => getPoint(item));
      const valid = points.filter((pt): pt is InkPoint => !!pt);
      const updated = {
        ...activeStroke.current,
        points: [...activeStroke.current.points, ...(valid.length ? valid : [getPoint(event)].filter((pt): pt is InkPoint => !!pt))]
      };
      activeStroke.current = updated;
      liveStrokes.current = liveStrokes.current.map(stroke => stroke.id === updated.id ? updated : stroke);
      setCurrentStrokes(liveStrokes.current);
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch") {
      touchCount.current = Math.max(0, touchCount.current - 1);
      return;
    }
    if (!drawing.current) return;
    drawing.current = false;
    setPenDrawing(false);

    if (activeTool === "eraser") {
      onChange(liveStrokes.current);
      activeStroke.current = null;
      if (event.pointerType === "pen") { penActive.current = false; penUpAt.current = performance.now(); }
      return;
    }

    if (activeStroke.current) {
      const finalStroke = activeStroke.current;
      activeStroke.current = null;
      const next = liveStrokes.current.map(stroke => stroke.id === finalStroke.id ? finalStroke : stroke);
      liveStrokes.current = next;
      onChange(next);
    }
    if (event.pointerType === "pen") { penActive.current = false; penUpAt.current = performance.now(); }
  }

  return (
    <svg
      ref={svgRef}
      className={`integrated-ink-overlay ${interactive ? "mode-ink" : "mode-text"} ${penDrawing ? "pen-drawing" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      style={{width: "100%", height: `${height}px`}}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {currentStrokes.map(stroke => {
        const isHighlighter = stroke.tool === "highlighter";
        const theme = (typeof document !== "undefined" && document.documentElement.dataset.theme) || "dark";
        const isDarkTheme = theme === "dark";
        const norm = (stroke.color || "").toLowerCase().trim();
        const displayColor = isDarkTheme
          ? (norm === "#000000" || norm === "#000" || norm === "#1e293b" || norm === "#0f172a" || norm === "black" ? "#ffffff" : stroke.color)
          : (norm === "#ffffff" || norm === "#fff" || norm === "#f8fafc" || norm === "white" ? "#000000" : stroke.color);
        return (
          <path
            key={stroke.id}
            d={strokePath(stroke)}
            fill="none"
            stroke={displayColor}
            strokeWidth={stroke.width * (isHighlighter ? 4 : 1)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isHighlighter ? 0.45 : 1}
            style={isHighlighter ? {mixBlendMode: "multiply"} : undefined}
          />
        );
      })}
    </svg>
  );
}

export type MixedEditorHandle={refresh:()=>void;getActiveBlock:()=>string|null};

export function MixedNoteEditor({
  noteId,
  initialContent = "",
  initialInk = false,
  onNavigateNote,
  onDirtyChange,
  fullscreen,
  onToggleFullscreen,
  ref
}: {
  noteId: string;
  initialContent?: string;
  initialInk?: boolean;
  onNavigateNote?: (target: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  ref?: {current: MixedEditorHandle | null};
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const startedInk = useRef(false);
  const docRef = useRef<HTMLDivElement>(null);
  const markdownPending = useRef(new Map<string, {value: string; version: number}>());
  const markdownTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveChains = useRef(new Map<string, Promise<void>>());
  const markdownSaving = useRef(new Set<string>());
  const activeBlockRef = useRef<string | null>(null);

  function updateDirty() {
    onDirtyChange?.(markdownPending.current.size > 0 || markdownTimers.current.size > 0 || markdownSaving.current.size > 0);
  }

  async function flushMarkdown(id: string) {
    const timer = markdownTimers.current.get(id);
    if (timer) clearTimeout(timer);
    markdownTimers.current.delete(id);
    const pending = markdownPending.current.get(id);
    if (!pending) return;
    markdownPending.current.delete(id);
    const previous = saveChains.current.get(id) || Promise.resolve();
    const next = previous.then(async () => {
      markdownSaving.current.add(id);
      updateDirty();
      const response = await fetch(`/api/v1/notes/${noteId}/blocks/${id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({markdown: pending.value, version: pending.version})
      });
      if (!response.ok) throw new Error((await response.json()).error?.message || "Save failed");
      const saved = await response.json();
      setBlocks(items => items.map(item => item.id === id ? {...item, version: saved.version, markdown: item.markdown === pending.value ? saved.markdown : item.markdown} : item));
      setError("");
    }).catch(reason => {
      markdownPending.current.set(id, pending);
      setError(reason.message || "Save failed");
    }).finally(() => { markdownSaving.current.delete(id); updateDirty(); });
    saveChains.current.set(id, next);
    await next;
  }

  function queueMarkdown(block: Block, value: string) {
    markdownPending.current.set(block.id, {value, version: block.version});
    const existing = markdownTimers.current.get(block.id);
    if (existing) clearTimeout(existing);
    markdownTimers.current.set(block.id, setTimeout(() => void flushMarkdown(block.id), 800));
    updateDirty();
  }

  async function flushMarkdownSaves() {
    await Promise.all([...markdownPending.current.keys()].map(id => flushMarkdown(id)));
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen && onToggleFullscreen) {
        onToggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, onToggleFullscreen]);

  // Integrated Editor State
  const [viewMode, setViewMode] = useState<"write" | "preview">(() => {
    if (typeof window === "undefined") return "preview";
    if (window.innerWidth > 600) return "write";
    return localStorage.getItem("noema-note-view-mode") === "write" ? "write" : "preview";
  });
  const [editorMode, setEditorMode] = useState<"text" | "ink">(initialInk ? "ink" : () => {
    if (typeof window === "undefined") return "text";
    if (window.innerWidth > 600) return "text";
    return localStorage.getItem("noema-note-ink-mode") === "ink" ? "ink" : "text";
  });
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.dataset.theme || localStorage.getItem("noema-theme") || "dark";
    }
    return "dark";
  });
  const [activeTool, setActiveTool] = useState<InkTool>("pen");
  const [penOptionsOpen, setPenOptionsOpen] = useState(false);
  const penButtonRef = useRef<HTMLButtonElement>(null);
  const closePenOptions = () => {
    setPenOptionsOpen(false);
    requestAnimationFrame(() => penButtonRef.current?.focus());
  };
  const [color, setColor] = useState(() => {
    if (typeof window !== "undefined") {
      const current = document.documentElement.dataset.theme || localStorage.getItem("noema-theme");
      if (current === "light") return "#000000";
      if (current === "dark") return "#ffffff";
    }
    return "#000000";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateTheme = () => {
      const current = document.documentElement.dataset.theme || localStorage.getItem("noema-theme") || "dark";
      setTheme(current);
      const isLight = current === "light";
      const targetDefault = isLight ? "#000000" : "#ffffff";
      setColor(prev => {
        if (prev === "#1e293b" || prev === "#0f172a" || prev === "#f8fafc" || prev === "#000000" || prev === "#ffffff") {
          return targetDefault;
        }
        return prev;
      });
    };

    updateTheme();

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-theme") {
          updateTheme();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  const [size, setSize] = useState(3);
  const [ocrPanelOpen, setOcrPanelOpen] = useState(false);
  const [dismissedOcr, setDismissedOcr] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);

  const inkBlock = blocks.find(b => b.kind === "ink");
  const overlayStrokes = useMemo(() => sanitizeStrokes(inkBlock?.strokes || []), [inkBlock?.strokes]);

  function moveInk(block: Block, delta: number) {
    const index = blocks.findIndex(item => item.id === block.id);
    void move(index, delta);
  }

  async function load() {
    if (markdownPending.current.size || markdownSaving.current.size) return;
    try {
      const response = await fetch(`/api/v1/notes/${noteId}/blocks`);
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (response.ok && Array.isArray(data.blocks) && data.blocks.length > 0) {
          setBlocks(data.blocks);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback below
    }
    setBlocks([
      {
        id: createId(),
        position: 0,
        kind: "markdown",
        markdown: initialContent || `# Note\n\n`,
        version: 1
      }
    ]);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load().catch(reason => {
      setError(reason.message);
      setLoading(false);
    });
    return () => { void flushMarkdownSaves(); };
  }, [noteId]);

  useEffect(() => {
    if (initialInk && !loading && !startedInk.current) {
      startedInk.current = true;
      setEditorMode("ink");
    }
  }, [initialInk, loading]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 600) {
      localStorage.setItem("noema-note-view-mode", viewMode);
      localStorage.setItem("noema-note-ink-mode", editorMode);
    }
  }, [viewMode, editorMode]);

  const pageRef = useRef<HTMLDivElement>(null);
  const pageZoomRef = useRef(1);
  const [pageZoom, setPageZoom] = useState(1);
  const pinchGesture = useRef<{distance: number} | null>(null);
  const wheelZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commitPageZoom(next: number, anchor?: {x: number; y: number}) {
    const container = docRef.current;
    const page = pageRef.current;
    const previous = pageZoomRef.current;
    const zoom = clampZoom(next);
    if (!container || !page || zoom === previous) return previous;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    page.style.zoom = String(zoom);
    pageZoomRef.current = zoom;
    if (anchor) {
      const ratio = zoom / previous;
      container.scrollLeft = (scrollLeft + anchor.x) * ratio - anchor.x;
      container.scrollTop = (scrollTop + anchor.y) * ratio - anchor.y;
    }
    return zoom;
  }

  useEffect(() => {
    const container = docRef.current;
    if (!container) return;
    const center = (touches: TouchList) => {
      const rect = container.getBoundingClientRect();
      return {x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left, y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top};
    };
    const spread = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchGesture.current = {distance: spread(event.touches)};
        event.preventDefault();
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      const gesture = pinchGesture.current;
      if (!gesture || event.touches.length !== 2) return;
      event.preventDefault();
      const distance = spread(event.touches);
      const ratio = distance / Math.max(1, gesture.distance);
      gesture.distance = distance;
      commitPageZoom(pageZoomRef.current * ratio, center(event.touches));
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (pinchGesture.current && event.touches.length < 2) {
        pinchGesture.current = null;
        setPageZoom(pageZoomRef.current);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const zoom = commitPageZoom(pageZoomRef.current * (event.deltaY < 0 ? 1.1 : 0.9), {x: event.clientX - rect.left, y: event.clientY - rect.top});
      if (wheelZoomTimer.current) clearTimeout(wheelZoomTimer.current);
      wheelZoomTimer.current = setTimeout(() => setPageZoom(zoom), 160);
    };
    container.addEventListener("touchstart", onTouchStart, {passive: false});
    container.addEventListener("touchmove", onTouchMove, {passive: false});
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);
    container.addEventListener("wheel", onWheel, {passive: false});
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      container.removeEventListener("wheel", onWheel);
      if (wheelZoomTimer.current) clearTimeout(wheelZoomTimer.current);
    };
  }, [loading]);

  function resetPageZoom() {
    const anchor = docRef.current ? {x: docRef.current.clientWidth / 2, y: docRef.current.clientHeight / 2} : undefined;
    commitPageZoom(1, anchor);
    setPageZoom(pageZoomRef.current);
  }


  useEffect(() => {
    if (!pageRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (pageRef.current) {
          const scale = pageZoomRef.current || 1;
          const scrollH = pageRef.current.scrollHeight || 0;
          const contentH = entry.contentRect ? Math.floor(entry.contentRect.height) : 0;
          setViewportWidth(Math.max(320, Math.floor(pageRef.current.getBoundingClientRect().width / scale)));
          setViewportHeight(Math.max(500, Math.floor(scrollH / scale), contentH));
        }
      }
    });
    observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [blocks, orientation]);

  const currentInkVersion = useRef<number>(inkBlock?.inkVersion || 0);
  const savingInkRef = useRef<boolean>(false);
  const pendingStrokesRef = useRef<InkStroke[] | null>(null);
  const gestureUndoPushed = useRef(false);
  const gestureBeforeRef = useRef<InkStroke[] | null>(null);

  useEffect(() => {
    if (inkBlock?.inkVersion !== undefined) {
      currentInkVersion.current = inkBlock.inkVersion;
    }
  }, [inkBlock?.inkVersion]);

  async function saveInkStrokes(nextStrokes: InkStroke[], pushUndo = true) {
    if (pushUndo) {
      setUndoStack(prev => [...prev, overlayStrokes]);
      setRedoStack([]);
    }
    const targetInkId = inkBlock?.id || createId();
    setBlocks(items => {
      const existing = items.find(item => item.id === targetInkId);
      if (existing) return items.map(item => item.id === targetInkId ? {...item, strokes: nextStrokes} : item);
      return [...items, {id: targetInkId, position: items.length, kind: "ink", markdown: "", version: 1, inkVersion: 0, strokes: nextStrokes}];
    });

    pendingStrokesRef.current = nextStrokes;
    if (savingInkRef.current) return;
    savingInkRef.current = true;

    while (pendingStrokesRef.current !== null) {
      const strokesToSave: InkStroke[] = pendingStrokesRef.current;
      pendingStrokesRef.current = null;

      try {
        const response = await fetch(`/api/v1/notes/${noteId}/ink`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": createId()
          },
          body: JSON.stringify({
            id: targetInkId,
            version: currentInkVersion.current,
            width: viewportWidth,
            height: viewportHeight,
            strokes: strokesToSave
          })
        });

        if (response.status === 409) {
          await load();
          if (!pendingStrokesRef.current) {
            pendingStrokesRef.current = strokesToSave;
          }
          continue;
        }

        if (response.ok) {
          const data = await response.json();
          currentInkVersion.current = data.version ?? data.inkVersion ?? currentInkVersion.current + 1;
          setBlocks(items => items.map(item => item.id === targetInkId ? {...item, strokes: strokesToSave, inkVersion: currentInkVersion.current} : item));
          setError("");
        } else {
          const errData = await response.json().catch(() => ({}));
          setError(errData.error?.message || "Save ink failed");
        }
      } catch {
        // Fallback
      }
    }

    savingInkRef.current = false;
  }

  function handleUndo() {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, overlayStrokes]);
    setUndoStack(prev => prev.slice(0, -1));
    void saveInkStrokes(previous, false);
  }

  function handleRedo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, overlayStrokes]);
    setRedoStack(prev => prev.slice(0, -1));
    void saveInkStrokes(next, false);
  }

  function handleClearInk() {
    if (!overlayStrokes.length) return;
    void saveInkStrokes([], true);
  }

  async function markdown(block: Block, value: string) {
    activeBlockRef.current = block.id;
    setBlocks(items => items.map(item => (item.id === block.id ? {...item, markdown: value} : item)));
    queueMarkdown(block, value);
  }

  useEffect(() => {
    if (!ref) return;
    ref.current = {refresh: () => void load(), getActiveBlock: () => activeBlockRef.current};
    return () => { ref.current = null; };
  });

  async function add(kind: "markdown" | "ink", source?: Block) {
    if (kind === "markdown") {
      await fetch(`/api/v1/notes/${noteId}/blocks`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Idempotency-Key": createId()},
        body: JSON.stringify({markdown: source?.markdown || ""})
      });
    } else {
      await fetch(`/api/v1/notes/${noteId}/ink`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Idempotency-Key": createId()},
        body: JSON.stringify({id: createId(), width: viewportWidth, height: viewportHeight, strokes: source?.strokes || []})
      });
    }
    await load();
  }

  async function remove(block: Block) {
    const response = await fetch(`/api/v1/notes/${noteId}/blocks/${block.id}`, {
      method: "DELETE",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({version: block.version})
    });
    if (response.ok) await load();
    else setError((await response.json()).error?.message || "Delete failed");
  }

  async function retryOcr(){if(!inkBlock)return;const response=await fetch(`/api/v1/ink/${inkBlock.id}/ocr`,{method:"POST"});if(!response.ok){setError((await response.json()).error?.message||"OCR retry failed");return}setBlocks(items=>items.map(item=>item.id===inkBlock.id?{...item,ocrStatus:"queued"}:item));setError("")}

  async function saveTranscript(){
    if(!inkBlock)return;
    setOcrBusy(true);
    try{
      const value=transcriptDraft??inkBlock.transcript??"";
      const response=await fetch(`/api/v1/ink/${inkBlock.id}/transcript`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({transcript:value,equations:inkBlock.equations||[],version:currentInkVersion.current})
      });
      if(!response.ok)throw new Error((await response.json()).error?.message||"Transcript save failed");
      setTranscriptDraft(null);
      setError("");
      await load();
    }catch(reason){setError((reason as Error).message)}
    finally{setOcrBusy(false)}
  }

  async function insertOcrAsMarkdown(){
    if(!inkBlock)return;
    const transcript=(transcriptDraft??inkBlock.transcript??"").trim();
    const equations=(inkBlock.equations||[]).map(e=>`$$${e.latex}$$`);
    const markdown=[transcript,...equations].filter(Boolean).join("\n\n");
    if(!markdown){setError("Nothing to insert yet — OCR has not produced text.");return}
    setOcrBusy(true);
    try{
      const created=await fetch(`/api/v1/notes/${noteId}/blocks`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":createId()},body:JSON.stringify({markdown})});
      if(!created.ok)throw new Error((await created.json()).error?.message||"Could not create block");
      const block=await created.json();
      const ids=blocks.map(item=>item.id),index=ids.indexOf(inkBlock.id);
      if(index>=0){
        ids.splice(index+1,0,block.id);
        const reordered=await fetch(`/api/v1/notes/${noteId}/blocks`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
        if(!reordered.ok)throw new Error((await reordered.json()).error?.message||"Could not place block");
      }
      await load();
    }catch(reason){setError((reason as Error).message)}
    finally{setOcrBusy(false)}
  }

  // Poll OCR jobs while any ink block is still being processed.
  useEffect(()=>{
    const active=blocks.some(block=>block.kind==="ink"&&["queued","pending","running","claimed"].includes(block.ocrStatus||""));
    if(!active)return;
    const timer=setInterval(()=>void load(),3000);
    return()=>clearInterval(timer);
  },[blocks]);

  async function move(index: number, delta: number) {
    const ids = blocks.map(block => block.id);
    const next = index + delta;
    if (next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    const response = await fetch(`/api/v1/notes/${noteId}/blocks`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ids})
    });
    if (response.ok) await load();
    else setError((await response.json()).error?.message || "Reorder failed");
  }

  async function insertInk(block: Block, value: string, caret: number) {
    const inkId = createId();
    const afterId = createId();
    const index = blocks.findIndex(item => item.id === block.id);
    const request = (url: string, body: object) =>
      fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Idempotency-Key": createId()},
        body: JSON.stringify(body)
      });
    try {
      const updated = await fetch(`/api/v1/notes/${noteId}/blocks/${block.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({markdown: value.slice(0,caret), version: block.version})
      });
      if (!updated.ok) throw new Error((await updated.json()).error?.message || "Could not split block");
      for (const [url, body] of [
        [`/api/v1/notes/${noteId}/ink`, {id: inkId, width: viewportWidth, height: viewportHeight, strokes: []}],
        [`/api/v1/notes/${noteId}/blocks`, {id: afterId, markdown: value.slice(caret)}]
      ] as const) {
        const response = await request(url, body);
        if (!response.ok) throw new Error((await response.json()).error?.message || "Could not insert ink");
      }
      const ids = blocks.map(item => item.id);
      ids.splice(index+1,0,inkId,afterId);
      const reordered = await fetch(`/api/v1/notes/${noteId}/blocks`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ids})
      });
      if (!reordered.ok) throw new Error((await reordered.json()).error?.message || "Could not place ink");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
      await load();
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setOrientation("landscape");
      } else {
        setOrientation("portrait");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) return (
    <div className="integrated-note-editor mixed-note-editor">
      <div className="integrated-doc-container">
        <div className="integrated-doc-page portrait" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="mixed-editor-loading">Loading document…</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="integrated-note-editor mixed-note-editor">
      {error && (
        <div className="tutor-error" role="alert">
          {error}
        </div>
      )}

      <div className={`integrated-floating-palette ${paletteCollapsed ? "collapsed" : ""}`} role="toolbar" aria-label="Note controls">
        {paletteCollapsed ? <button className="palette-expand-btn" onClick={() => setPaletteCollapsed(false)} aria-label="Expand note controls" title="Expand note controls"><PencilLine size={18} /><CaretDown size={14} /></button> : <div className="palette-rows-container">
        <div className="palette-row">
          <div className="palette-group" aria-label="Document view">
            <button className={viewMode === "write" ? "active" : ""} onClick={() => setViewMode("write")} aria-pressed={viewMode === "write"}>Edit</button>
            <button className={viewMode === "preview" ? "active" : ""} onClick={() => setViewMode("preview")} aria-pressed={viewMode === "preview"}>Preview</button>
          </div>
          <button className={`ink-mode-toggle ${editorMode === "ink" ? "active" : ""}`} onClick={() => setEditorMode(mode => mode === "ink" ? "text" : "ink")} aria-pressed={editorMode === "ink"} title="Toggle ink layer">
            <PencilLine size={18} /><span>Ink</span>
          </button>
          {inkBlock&&<span className="status-label" role="status">OCR · {inkBlock.ocrStatus||"pending"}{inkBlock.ocrStatus==="failed"&&<button type="button" onClick={()=>void retryOcr()}>Retry</button>}<button type="button" aria-expanded={ocrPanelOpen} aria-label="Toggle OCR review panel" onClick={()=>{setOcrPanelOpen(open=>!open);setDismissedOcr(false)}}>{ocrPanelOpen?"Hide":"Review"}</button></span>}
          <details className="note-toolbar-menu">
            <summary aria-label="More note options" title="More note options"><DotsThree size={20} /></summary>
            <div>
              <button onClick={() => setShowAnnotations(v => !v)}>{showAnnotations ? <Eye size={18} /> : <EyeSlash size={18} />}<span>{showAnnotations ? "Hide ink" : "Show ink"}</span></button>
              {pageZoom !== 1 && <button onClick={resetPageZoom}><span>Reset zoom ({Math.round(pageZoom * 100)}%)</span></button>}
              {onToggleFullscreen && <button onClick={onToggleFullscreen}>{fullscreen ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}<span>{fullscreen ? "Exit fullscreen" : "Fullscreen"}</span></button>}
            </div>
          </details>
          <button onClick={() => setPaletteCollapsed(true)} aria-label="Collapse note controls" title="Collapse note controls"><CaretUp size={18} /></button>
        </div>
            {editorMode === "ink" && (
              <div className="palette-row">
                <div className="palette-group">
                  <div className="pen-tool-wrapper">
                    <button
                      ref={penButtonRef}
                      className={activeTool === "pen" ? "active" : ""}
                      onClick={() => {
                        if (activeTool === "pen") {
                          setPenOptionsOpen(open => !open);
                        } else {
                          setActiveTool("pen");
                          setPenOptionsOpen(false);
                        }
                      }}
                      onDoubleClick={() => {
                        setActiveTool("pen");
                        setPenOptionsOpen(true);
                      }}
                      title="Pen (Double click for options)"
                      aria-label="Pen tool"
                    >
                      <PenNib size={18} />
                      <span
                        className="pen-color-dot"
                        style={{backgroundColor: color === "#000000" && theme === "dark" ? "#ffffff" : color}}
                      />
                    </button>

                    {activeTool === "pen" && penOptionsOpen && (
                      <div className="pen-options-popover" role="dialog" aria-modal="false" aria-label="Pen settings" onKeyDown={event=>{if(event.key==="Escape")closePenOptions()}}>
                        <header>
                          <span>Pen Settings</span>
                          <button type="button" className="close-btn icon-button" aria-label="Close pen settings" onClick={closePenOptions}>×</button>
                        </header>
                        <div className="popover-section">
                          <label>Colors</label>
                          <div className="ink-color-presets" role="group" aria-label="Ink color presets">
                            {[
                              { id: "default", name: theme === "light" ? "Black (Theme default)" : "White (Theme default)", value: theme === "light" ? "#000000" : "#ffffff" },
                              { id: "red", name: "Red", value: "#ef4444" },
                              { id: "blue", name: "Blue", value: "#3b82f6" },
                              { id: "green", name: "Green", value: "#22c55e" },
                              { id: "yellow", name: "Yellow", value: "#eab308" }
                            ].map(p => {
                              const isDefaultPill = p.id === "default";
                              const isActive = isDefaultPill
                                ? (color === "#000000" || color === "#ffffff" || color === "#1e293b" || color === "#0f172a" || color === "#f8fafc")
                                : color === p.value;
                              return (
                                <button
                                  type="button"
                                  key={p.id}
                                  title={p.name}
                                  aria-label={p.name}
                                  className={`color-swatch-btn ${isActive ? "active" : ""}`}
                                  style={{
                                    backgroundColor: p.value,
                                    borderColor: isActive ? "var(--primary, #0284c7)" : (p.value === "#ffffff" ? "#cbd5e1" : p.value)
                                  }}
                                  onClick={() => setColor(p.value)}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <div className="popover-section">
                          <label>
                            <span>Stroke Width</span>
                            <small>{size}px</small>
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="16"
                            value={size}
                            onChange={e => setSize(Number(e.target.value))}
                            title="Stroke Thickness"
                            aria-label="Stroke Thickness"
                            className="palette-range-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    className={activeTool === "highlighter" ? "active" : ""}
                    onClick={() => { setActiveTool("highlighter"); setPenOptionsOpen(false); }}
                    title="Highlighter"
                    aria-label="Highlighter tool"
                  >
                    <HighlighterCircle size={18} />
                  </button>
                  <button
                    className={activeTool === "eraser" ? "active" : ""}
                    onClick={() => { setActiveTool("eraser"); setPenOptionsOpen(false); }}
                    title="Eraser"
                    aria-label="Eraser tool"
                  >
                    <Broom size={18} />
                  </button>
                </div>

                <div className="palette-divider" />

                <div className="palette-group">
                  <button onClick={handleUndo} disabled={!undoStack.length} title="Undo stroke" aria-label="Undo stroke">
                    <ArrowCounterClockwise size={16} />
                  </button>
                  <button onClick={handleRedo} disabled={!redoStack.length} title="Redo stroke" aria-label="Redo stroke">
                    <ArrowClockwise size={16} />
                  </button>
                  <button onClick={handleClearInk} disabled={!overlayStrokes.length} title="Clear Ink" aria-label="Clear Ink">
                    <Trash size={16} />
                  </button>
                  <button
                    className="primary ink-done-btn"
                    onClick={() => {
                      saveInkStrokes(overlayStrokes);
                      setEditorMode("text");
                    }}
                    title="Done saving handwriting"
                    aria-label="Done saving handwriting"
                    style={{
                      background: "var(--primary)",
                      color: "#ffffff",
                      fontWeight: 600,
                      padding: "0 14px",
                      borderRadius: "9999px",
                      height: "32px",
                      marginLeft: "4px"
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
        </div>}
      </div>

      {/* OCR surfacing panel */}
      {ocrPanelOpen && !dismissedOcr && inkBlock && (
        <section className="ocr-review-panel" aria-label="OCR review">
          <header>
            <strong>Handwriting recognition</strong>
            <span className="status-label">{inkBlock.ocrStatus||"pending"}</span>
            <button type="button" className="secondary" disabled={ocrBusy} onClick={()=>setDismissedOcr(true)}>Dismiss</button>
          </header>
          <label>
            Transcript
            <textarea
              value={transcriptDraft??inkBlock.transcript??""}
              onChange={event=>setTranscriptDraft(event.target.value)}
              placeholder="Recognized text appears here; strokes remain authoritative."
            />
          </label>
          {(inkBlock.equations?.length||0) > 0 && (
            <ul className="ocr-equations" aria-label="Recognized equations">
              {inkBlock.equations!.map((equation,index)=>(
                <li key={index}><code>{equation.latex}</code><small>confidence: {equation.confidence}</small></li>
              ))}
            </ul>
          )}
          <footer>
            <button type="button" className="secondary" disabled={ocrBusy} onClick={()=>void saveTranscript()}>Save correction</button>
            <button type="button" className="primary" disabled={ocrBusy} onClick={()=>void insertOcrAsMarkdown()}>Insert as markdown</button>
          </footer>
        </section>
      )}

      {/* Dual-Layer Viewport Bounded Sheet */}
      <div className="integrated-doc-container" ref={docRef}>
        <div className={`integrated-doc-page ${orientation}`} ref={pageRef}>
          {/* Foreground Layer 2: Interactive SVG Ink Overlay */}
          <IntegratedOverlayCanvas
            width={viewportWidth}
            height={viewportHeight}
            strokes={overlayStrokes}
            activeTool={activeTool}
            color={color}
            size={size}
            interactive={editorMode === "ink"}
            visible={showAnnotations}
            zoomRef={pageZoomRef}
            onChange={saveInkStrokes}
          />

          {/* Background Layer 1: Rendered Document Blocks */}
          <div className="integrated-doc-content" style={{position: "relative", zIndex: 1}}>
            {blocks.map((block) =>
              block.kind === "markdown" ? (
                <article className="note-block" key={block.id}>
                  <MarkdownBlock
                    block={block}
                    preview={viewMode === "preview"}
                    onSave={markdown}
                    onInsertInk={insertInk}
                    onNavigateNote={onNavigateNote}
                  />
                </article>
              ) : block.id === inkBlock?.id ? null : (
                <InkBlockView
                  key={block.id}
                  noteId={noteId}
                  block={block}
                  onMove={moveInk}
                  onDelete={remove}
                  onSaved={load}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
