"use client";

import {createId} from "../lib/id";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Rectangle,
  Circle,
  Ruler,
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
  Selection,
  PencilLine,
  PenNib,
  Plus,
  TextT,
  Trash
} from "@phosphor-icons/react";
import {InkEditor} from "./InkEditor";
import {
  clampZoom,
  clampInkStrokes,
  pinchViewport,
  eraseAt,
  InkPoint,
  InkStroke,
  InkTool,
  sanitizeStrokes,
  strokePath,
  svgClientToPoint,
  acceptInkPointer,
  penRecentlyUp,
  saveInkWithRetry,
  zoomAtScreenPoint
} from "../lib/ink";
import {MarkdownContent, extractTagsAndCleanText, StructuredTags} from "./MarkdownContent";
import {LiveMarkdownEditor} from "./LiveMarkdownEditor";
import {ModalDialog} from "./ModalDialog";

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
  composition?: Composition;
};

type CompositionText={id:string;type:"text";x:number;y:number;width:number;height:number;z:number;markdown:string};
type Composition={formatVersion:1|2;layout?:"paper";paperWidth?:number;writingExtent?:number;background:"blank"|"ruled"|"grid";objects:CompositionText[]};

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
  readOnly = false,
  onSave,
  onNavigateNote
}: {
  block: Block;
  preview: boolean;
  readOnly?: boolean;
  onSave: (block: Block, value: string) => void;
  onNavigateNote?: (target: string) => void;
}) {
  const [value, setValue] = useState(block.markdown);

  useEffect(() => {
    setValue(block.markdown);
  }, [block.markdown]);

  return (
    <div className="markdown-block-editor">
      <LiveMarkdownEditor
        value={value}
        readOnly={readOnly || preview}
        onChange={(val) => { setValue(val); onSave(block, val); }}
        onBlur={() => {}}
      />
    </div>
  );
}

function InkBlockView({
  noteId,
  block,
  onMove,
  onDelete,
  onSaved,
  onCompositionChange
}: {
  noteId: string;
  block: Block;
  onMove: (block: Block, delta: number) => void;
  onDelete: (block: Block) => void;
  onSaved: () => void;
  onCompositionChange: (block:Block,composition:Composition) => void;
}) {
  const {proposal, busy, request, decide} = useMathContinuationFlow(noteId, block.id);
  return (
    <section className="note-block ink-note-block">
      <nav>
        <span>Paper</span>
        <select aria-label="Paper background" value={block.composition?.background||"blank"} onChange={event=>onCompositionChange(block,{...(block.composition||{formatVersion:1,objects:[]}),background:event.target.value as Composition["background"]})}><option value="blank">Blank</option><option value="ruled">Ruled</option><option value="grid">Grid</option></select>
        <button type="button" onClick={()=>onCompositionChange(block,{...(block.composition||{formatVersion:1,background:"blank",objects:[]}),objects:[...(block.composition?.objects||[]),{id:createId(),type:"text",x:40,y:40,width:320,height:120,z:(block.composition?.objects.length||0)+1,markdown:"Type here"}]})}><TextT size={14}/> Add text</button>
        <button type="button" disabled={busy} onClick={() => void request()} aria-label="Continue math with AI">Continue math</button>
        <button type="button" onClick={() => onMove(block, -1)} aria-label="Move ink block up"><ArrowUp size={14} /></button>
        <button type="button" onClick={() => onMove(block, 1)} aria-label="Move ink block down"><ArrowDown size={14} /></button>
        <button type="button" onClick={() => onDelete(block)} aria-label="Delete ink block"><Trash size={14} /></button>
      </nav>
      {proposal && <MathContinuationCard continuation={proposal} busy={busy} onDecide={action => { void decide(action).then(() => { if (action === "accept") onSaved(); }); }} />}
      <div className={`fixed-composition-paper paper-${block.composition?.background||"blank"}`} style={{aspectRatio:`${block.width||794}/${block.height||1123}`}}>
        <InkEditor id={block.id} noteId={noteId} strokes={sanitizeStrokes(block.strokes)} version={block.inkVersion || 0} transcript={block.transcript || ""} ocrStatus={block.ocrStatus || "pending"} onSaved={onSaved}/>
        {(block.composition?.objects||[]).map(object=><textarea key={object.id} className="composition-text-box" aria-label="Composition text" defaultValue={object.markdown} style={{left:`${object.x/(block.width||794)*100}%`,top:`${object.y/(block.height||1123)*100}%`,width:`${object.width/(block.width||794)*100}%`,height:`${object.height/(block.height||1123)*100}%`,zIndex:object.z}} onBlur={event=>onCompositionChange(block,{...block.composition!,objects:block.composition!.objects.map(item=>item.id===object.id?{...item,markdown:event.target.value}:item)})}/>) }
      </div>
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
  onChange,
  onResize,
  onPinch,
  onGestureUndo
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
  onResize?: (width: number, height: number) => void;
  onPinch?: (previousCenter: {x: number; y: number}, nextCenter: {x: number; y: number}, distRatio: number) => void;
  onGestureUndo?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const activeStroke = useRef<InkStroke | null>(null);
  const [currentStrokes, setCurrentStrokes] = useState<InkStroke[]>(strokes);
  const [penDrawing, setPenDrawing] = useState(false);
  const liveStrokes = useRef<InkStroke[]>(strokes);
  const penActive = useRef(false);
  const penUpAt = useRef(0);
  const touchPoints = useRef(new Map<number, {x: number; y: number}>());
  const pinchDistance = useRef(0);
  const pinchCenter = useRef({x: 0, y: 0});
  const lastTwoTap = useRef(0);
  const touchTap = useRef<{started:number; x:number; y:number; distance:number; moved:boolean} | null>(null);
  const lassoStart = useRef<InkPoint | null>(null);
  const selectionDrag = useRef<{point:InkPoint;before:InkStroke[]} | null>(null);
  const [lassoBox,setLassoBox]=useState<{left:number;top:number;right:number;bottom:number}|null>(null);
  const [selected,setSelected]=useState<string[]>([]);

  useEffect(() => {
    setCurrentStrokes(strokes);
    liveStrokes.current = strokes;
  }, [strokes]);

  // Report the rendered box (in layout pixels) so the saved document dimensions
  // always match the coordinate space strokes are captured in. Sizing comes
  // from CSS alone, so measuring never feeds back into layout.
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const update = () => {
      if (!onResizeRef.current) return;
      const w = Math.max(1, element.clientWidth);
      const h = Math.max(1, element.clientHeight);
      if (w > 0 && h > 0) onResizeRef.current(w, h);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  if (!visible) return null;

  function getPoint(event: {clientX:number;clientY:number;pressure:number;pointerType:string;timeStamp:number;tiltX:number;tiltY:number}): InkPoint | null {
    const element = svgRef.current;
    if (!element) return null;
    // Browser-derived screen→user-space mapping stays exact at any page zoom.
    const mapped = svgClientToPoint(element, event.clientX, event.clientY);
    if (!mapped) return null;
    return {
      x: Math.max(0, Math.min(width, mapped.x)),
      y: Math.max(0, Math.min(height, mapped.y)),
      pressure: event.pressure > 0 ? event.pressure : event.pointerType === "pen" ? 0.5 : 1,
      time: event.timeStamp,
      tiltX: Number(event.tiltX) || 0,
      tiltY: Number(event.tiltY) || 0
    };
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!interactive) return;

    // Touches are gesture-only on the overlay (drawing stays pen/mouse).
    // Two fingers drive page pinch-zoom/pan via onPinch; two-finger double
    // tap undoes the last stroke via onGestureUndo.
    if (event.pointerType === "touch") {
      if (penRecentlyUp(event.pointerType, penActive.current, penUpAt.current)) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      touchPoints.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (touchPoints.current.size === 2) {
        const [a, b] = [...touchPoints.current.values()];
        touchTap.current = {started:performance.now(),x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y),moved:false};
        pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
        pinchCenter.current = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
      }
      return;
    }
    if (!acceptInkPointer(event.pointerType, penActive.current)) return;
    if (event.pointerType === "pen") penActive.current = true;

    const pt = getPoint(event);
    if (!pt) return;
    if(activeTool==="lasso"){
      const hit=lassoBox&&pt.x>=lassoBox.left&&pt.x<=lassoBox.right&&pt.y>=lassoBox.top&&pt.y<=lassoBox.bottom;
      if(hit&&selected.length)selectionDrag.current={point:pt,before:liveStrokes.current};
      else{lassoStart.current=pt;setLassoBox({left:pt.x,top:pt.y,right:pt.x,bottom:pt.y});setSelected([])}
      drawing.current=true;(event.target as HTMLElement).setPointerCapture?.(event.pointerId);return;
    }
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

    const tool = activeTool === "pan" ? "pen" : activeTool;
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
    if (!interactive) return;

    // Two-finger pinch-zoom and pan, forwarded to the page navigation handler.
    if (event.pointerType === "touch") {
      const previous = touchPoints.current.get(event.pointerId);
      if (!previous) return;
      touchPoints.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (touchPoints.current.size === 2 && onPinch) {
        const [a, b] = [...touchPoints.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const center = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
        const tap = touchTap.current;
        if (tap && (Math.hypot(center.x-tap.x,center.y-tap.y)>8 || Math.abs(distance-tap.distance)>8)) { tap.moved=true; lastTwoTap.current=0; }
        const previousCenter = pinchCenter.current;
        const distRatio = distance / Math.max(1, pinchDistance.current);
        pinchDistance.current = distance;
        pinchCenter.current = center;
        onPinch(previousCenter, center, distRatio);
      }
      return;
    }

    if (!drawing.current) return;

    const pt = getPoint(event);
    if (!pt) return;
    if(activeTool==="lasso"){
      if(selectionDrag.current){const dx=pt.x-selectionDrag.current.point.x,dy=pt.y-selectionDrag.current.point.y;liveStrokes.current=selectionDrag.current.before.map(stroke=>selected.includes(stroke.id)?{...stroke,points:stroke.points.map(point=>({...point,x:point.x+dx,y:point.y+dy}))}:stroke);setCurrentStrokes(liveStrokes.current)}
      else if(lassoStart.current)setLassoBox({left:Math.min(lassoStart.current.x,pt.x),top:Math.min(lassoStart.current.y,pt.y),right:Math.max(lassoStart.current.x,pt.x),bottom:Math.max(lassoStart.current.y,pt.y)});
      return;
    }

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
        points: ["ruler", "rectangle", "ellipse", "arrow"].includes(activeStroke.current.tool)
          ? [activeStroke.current.points[0], pt]
          : [...activeStroke.current.points, ...(valid.length ? valid : [pt])]
      };
      activeStroke.current = updated;
      liveStrokes.current = liveStrokes.current.map(stroke => stroke.id === updated.id ? updated : stroke);
      setCurrentStrokes(liveStrokes.current);
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch") {
      const tap=touchTap.current;
      if (touchPoints.current.size===2 && tap) {
        const now=performance.now();
        if(event.type!=="pointercancel" && !tap.moved && now-tap.started<250) {
          if(lastTwoTap.current>0 && now-lastTwoTap.current<350) {lastTwoTap.current=0;onGestureUndo?.();}
          else lastTwoTap.current=now;
        } else lastTwoTap.current=0;
        touchTap.current=null;
      }
      touchPoints.current.delete(event.pointerId);
      return;
    }
    if (!drawing.current) return;
    drawing.current = false;
    setPenDrawing(false);
    if(event.type==="pointercancel"){
      if(selectionDrag.current){liveStrokes.current=selectionDrag.current.before;setCurrentStrokes(liveStrokes.current)}
      else if(activeStroke.current){liveStrokes.current=liveStrokes.current.filter(stroke=>stroke.id!==activeStroke.current?.id);setCurrentStrokes(liveStrokes.current)}
      selectionDrag.current=null;activeStroke.current=null;lassoStart.current=null;setLassoBox(null);return;
    }
    if(activeTool==="lasso"){
      if(selectionDrag.current){selectionDrag.current=null;onChange(liveStrokes.current)}
      else if(lassoBox){setSelected(liveStrokes.current.filter(stroke=>stroke.points.some(point=>point.x>=lassoBox.left&&point.x<=lassoBox.right&&point.y>=lassoBox.top&&point.y<=lassoBox.bottom)).map(stroke=>stroke.id))}
      lassoStart.current=null;return;
    }

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
      preserveAspectRatio="none"
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
      {lassoBox&&<rect className="ink-lasso-selection" x={lassoBox.left} y={lassoBox.top} width={lassoBox.right-lassoBox.left} height={lassoBox.bottom-lassoBox.top}/>}
    </svg>
  );
}

export type MixedEditorHandle={refresh:()=>void;getActiveBlock:()=>string|null;flush:()=>Promise<boolean>;rename:(title:string)=>Promise<void>};

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
  const savedVersions = useRef(new Map<string, number>());
  const markdownSaving = useRef(new Set<string>());
  const activeBlockRef = useRef<string | null>(null);

  const savingInkRef = useRef<boolean>(false);
  const pendingStrokesRef = useRef<InkStroke[] | null>(null);

  function updateDirty() {
    onDirtyChange?.(markdownPending.current.size > 0 || markdownTimers.current.size > 0 || markdownSaving.current.size > 0 || savingInkRef.current || pendingStrokesRef.current !== null);
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
        body: JSON.stringify({markdown: pending.value, version: savedVersions.current.get(id) ?? pending.version})
      });
      if (!response.ok) throw new Error((await response.json()).error?.message || "Save failed");
      const saved = await response.json();
      savedVersions.current.set(id, saved.version);
      setBlocks(items => items.map(item => item.id === id ? {...item, version: saved.version, markdown: item.markdown === pending.value ? saved.markdown : item.markdown} : item));
      setError("");
    }).catch(reason => {
      if (!markdownPending.current.has(id)) markdownPending.current.set(id, pending);
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
  const [paperPrompt,setPaperPrompt]=useState(false);
  const [selectedObjectId,setSelectedObjectId]=useState<string|null>(null);
  useEffect(() => {
    try { setPaletteCollapsed(localStorage.getItem(`noema-tools-${editorMode}`) === "hidden"); } catch {}
  }, [editorMode]);
  function collapseTools(hidden: boolean) {
    setPaletteCollapsed(hidden);
    try { localStorage.setItem(`noema-tools-${editorMode}`, hidden ? "hidden" : "visible"); } catch {}
  }
  const inkToolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const toolbar=inkToolbarRef.current,container=docRef.current;
    if(!toolbar||!container)return;
    const measure=()=>container.style.setProperty("--ink-toolbar-space",`${toolbar.offsetHeight+24}px`);
    measure();
    const observer=new ResizeObserver(measure);observer.observe(toolbar);
    return()=>observer.disconnect();
  },[editorMode,paletteCollapsed,loading]);
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

  // The full-page overlay binds to the LAST ink block (most recent layer). Earlier
  // ink blocks render inline; binding to the first instead would let a newly
  // inserted inline canvas steal the overlay and hide the page-wide ink.
  const inkBlock = useMemo(() => {
    for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].kind === "ink") return blocks[i];
    return undefined;
  }, [blocks]);
  const overlayStrokes = useMemo(() => sanitizeStrokes(inkBlock?.strokes || []), [inkBlock?.strokes]);
  const paperLayout=inkBlock?.composition?.layout==="paper";

  function moveInk(block: Block, delta: number) {
    const index = blocks.findIndex(item => item.id === block.id);
    void move(index, delta);
  }

  async function load() {
    if (markdownPending.current.size || markdownSaving.current.size || savingInkRef.current || pendingStrokesRef.current !== null) return;
    try {
      const response = await fetch(`/api/v1/notes/${noteId}/blocks`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Could not load this note");
      if (!Array.isArray(data.blocks) || !data.blocks.length) throw new Error("This note has no editable blocks");
      const overlay = [...data.blocks].reverse().find((block: Block) => block.kind === "ink");
      if (overlay?.width) setViewportWidth(overlay.width);
      if (overlay?.composition?.layout==="paper") setViewportHeight(overlay.composition.writingExtent||overlay.height||1123);
      else if (overlay?.height) setViewportHeight(overlay.height);
      setBlocks(data.blocks);
      setError("");
    } catch (reason) {
      setError((reason as Error).message || "Could not load this note");
    } finally { setLoading(false); }
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
      if(paperLayout)setEditorMode("ink");else void activatePaper();
    }
  }, [initialInk, loading, paperLayout]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 600) {
      localStorage.setItem("noema-note-view-mode", viewMode);
      localStorage.setItem("noema-note-ink-mode", editorMode);
    }
  }, [viewMode, editorMode]);

  const pageRef = useRef<HTMLDivElement>(null);
  const pageZoomRef = useRef(1);
  const [pageZoom, setPageZoom] = useState(1);
  const gesture = useRef<{distance: number; cx: number; cy: number} | null>(null);
  const lastTwoFingerTap = useRef(0);
  const wheelZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest-value mirrors so the touch listeners below never read stale closures.
  const editorModeRef = useRef(editorMode);
  editorModeRef.current = editorMode;
  const gestureUndoRef = useRef(handleUndo);
  gestureUndoRef.current = handleUndo;

  function commitPageZoom(next: number, previousFocal?: {x: number; y: number}, nextFocal?: {x: number; y: number}) {
    const container = docRef.current;
    const page = pageRef.current;
    const previous = pageZoomRef.current;
    const zoom = clampZoom(next);
    if (!container || !page) return previous;
    if (zoom !== 1 && !page.style.width) {
      page.style.setProperty("width", `${page.offsetWidth}px`, "important");
      page.style.setProperty("min-height", `${page.offsetHeight}px`, "important");
    }
    const containerRect = container.getBoundingClientRect();
    const pageRect = page.getBoundingClientRect();
    const viewport = {x: pageRect.left - containerRect.left, y: pageRect.top - containerRect.top, zoom: pageRect.width / page.offsetWidth};
    page.style.zoom = String(zoom);
    if (zoom === 1) {
      page.style.removeProperty("width");
      page.style.removeProperty("min-height");
    }
    const scaledRect = page.getBoundingClientRect();
    const actualZoom = scaledRect.width / page.offsetWidth;
    const target = previousFocal
      ? nextFocal
        ? pinchViewport(viewport, previousFocal, nextFocal, actualZoom)
        : zoomAtScreenPoint(viewport, previousFocal, actualZoom)
      : {...viewport, zoom: actualZoom};
    pageZoomRef.current = actualZoom;
    container.scrollLeft += scaledRect.left - containerRect.left - target.x;
    container.scrollTop += scaledRect.top - containerRect.top - target.y;
    return actualZoom;
  }

  useEffect(() => {
    const container = docRef.current;
    if (!container) return;
    const center = (touches: TouchList) => {
      const rect = container.getBoundingClientRect();
      return {x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left, y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top};
    };
    const spread = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    // Ink surfaces handle two-finger gestures themselves (.ink-canvas runs its
    // own view pinch; the overlay forwards to page zoom via onPinch), so the
    // container must skip them or every gesture would be applied twice.
    const onInkSurface = (event: TouchEvent) =>
      event.target instanceof Element && !!event.target.closest(".ink-canvas,.integrated-ink-overlay.mode-ink");
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2 || onInkSurface(event)) return;
      event.preventDefault();
      const point = center(event.touches);
      gesture.current = {distance: spread(event.touches), cx: point.x, cy: point.y};
    };
    const onTouchMove = (event: TouchEvent) => {
      const active = gesture.current;
      if (!active || event.touches.length !== 2) return;
      event.preventDefault();
      const distance = spread(event.touches);
      const next = center(event.touches);
      commitPageZoom(pageZoomRef.current * (distance / Math.max(1, active.distance)), {x: active.cx, y: active.cy}, next);
      active.distance = distance;
      active.cx = next.x;
      active.cy = next.y;
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (gesture.current && event.touches.length < 2) {
        gesture.current = null;
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

  useEffect(()=>{
    if(!paperLayout||!docRef.current)return;
    const frame=requestAnimationFrame(()=>{const fit=Math.min(1,Math.max(.25,(docRef.current!.clientWidth-32)/794));commitPageZoom(fit);setPageZoom(pageZoomRef.current)});
    return()=>cancelAnimationFrame(frame);
  },[paperLayout,noteId]);


  // Overlay dimensions come from the overlay's rendered box itself (reported by
  // IntegratedOverlayCanvas). Deriving them from pageRef.scrollHeight fed back
  // through layout: the absolutely-positioned overlay inflated scrollHeight,
  // which grew its own height on every observer tick until the server rejected
  // the document as "Invalid ink dimensions".
  const handleOverlayResize = useCallback((w: number, h: number) => {
    setViewportWidth(current => current === w ? current : w);
    setViewportHeight(current => current === h ? current : h);
  }, []);

  // The ink overlay owns its touches (drawing stays pen/mouse-only) and
  // forwards two-finger gestures here so page navigation keeps working even
  // though the container's touch handlers ignore ink surfaces.
  function handleOverlayPinch(previous: {x: number; y: number}, next: {x: number; y: number}, distRatio: number) {
    const container = docRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    commitPageZoom(pageZoomRef.current * distRatio, {x: previous.x - rect.left, y: previous.y - rect.top}, {x: next.x - rect.left, y: next.y - rect.top});
  }

  const currentInkVersion = useRef<number>(inkBlock?.inkVersion || 0);

  const gestureUndoPushed = useRef(false);
  const gestureBeforeRef = useRef<InkStroke[] | null>(null);
  // Stable id for the full-page overlay ink block; reused across rapid strokes so
  // two saves in one render pass cannot mint competing blocks.
  const overlayInkIdRef = useRef<string | null>(inkBlock?.id || null);

  useEffect(() => {
    if (inkBlock?.id) overlayInkIdRef.current = inkBlock.id;
  }, [inkBlock?.id]);

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
    if (!overlayInkIdRef.current) overlayInkIdRef.current = inkBlock?.id || createId();
    const targetInkId = overlayInkIdRef.current;
    setBlocks(items => {
      const existing = items.find(item => item.id === targetInkId);
      if (existing) return items.map(item => item.id === targetInkId ? {...item, strokes: nextStrokes} : item);
      return [...items, {id: targetInkId, position: items.length, kind: "ink", markdown: "", version: 1, inkVersion: 0, width: viewportWidth, height: viewportHeight, strokes: nextStrokes}];
    });

    pendingStrokesRef.current = nextStrokes;
    updateDirty();
    if (savingInkRef.current) return;
    savingInkRef.current = true;

    let attempts = 0;
    while (pendingStrokesRef.current !== null && attempts < 5) {
      const strokesToSave: InkStroke[] = pendingStrokesRef.current;
      pendingStrokesRef.current = null;
      attempts++;

      try {
        const data = await saveInkWithRetry(noteId, {
            id: targetInkId,
            version: currentInkVersion.current,
            width: viewportWidth,
            height: viewportHeight,
            // Strokes captured before a resize may sit outside the current
            // document box; pin them into it so validation never rejects them.
            strokes: clampInkStrokes(strokesToSave, viewportWidth, viewportHeight)
        }, fetch, createId);
        currentInkVersion.current = data.version ?? data.inkVersion ?? currentInkVersion.current + 1;
        setBlocks(items => items.map(item => item.id === targetInkId ? {...item, inkVersion: currentInkVersion.current} : item));
        setError("");
        attempts = 0;
      } catch (reason) {
        pendingStrokesRef.current ??= strokesToSave;
        setError((reason as Error).message || "Save ink failed");
        break;
      }
    }

    savingInkRef.current = false;
    updateDirty();
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

  useEffect(() => {
    const keydown=(event:KeyboardEvent)=>{
      if(editorMode!=="ink" || !(event.ctrlKey||event.metaKey) || event.key.toLowerCase()!=="z")return;
      if(event.target instanceof HTMLElement && event.target.matches("input,textarea"))return;
      event.preventDefault();
      if(event.shiftKey)handleRedo();else handleUndo();
    };
    document.addEventListener("keydown",keydown);
    return()=>document.removeEventListener("keydown",keydown);
  },[editorMode,undoStack,redoStack]);

  function handleClearInk() {
    if (!overlayStrokes.length) return;
    void saveInkStrokes([], true);
  }

  async function markdown(block: Block, value: string) {
    activeBlockRef.current = block.id;
    setBlocks(items => items.map(item => (item.id === block.id ? {...item, markdown: value} : item)));
    queueMarkdown(block, value);
  }

  async function flush() {
    await flushMarkdownSaves();
    await Promise.all(saveChains.current.values());
    const deadline = Date.now() + 10000;
    while (savingInkRef.current && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    if (pendingStrokesRef.current && !savingInkRef.current) await saveInkStrokes([...pendingStrokesRef.current], false);
    return !markdownPending.current.size && !markdownSaving.current.size && !savingInkRef.current && pendingStrokesRef.current === null;
  }

  async function rename(title: string) {
    if (!await flush()) throw new Error("Save your pending changes before renaming");
    const block = blocks.find(item => item.kind === "markdown");
    if (!block) throw new Error("No text block to rename");
    const value = /^#\s+.+$/m.test(block.markdown) ? block.markdown.replace(/^#\s+.+$/m, `# ${title}`) : `# ${title}\n\n${block.markdown}`;
    await markdown(block, value);
    if (!await flush()) throw new Error("Could not save the new title");
  }

  useEffect(() => {
    if (!ref) return;
    ref.current = {refresh: () => void load(), getActiveBlock: () => activeBlockRef.current, flush, rename};
    return () => { ref.current = null; };
  });

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

  async function activatePaper(background:Composition["background"]="blank"){
    const response=await fetch(`/api/v1/notes/${noteId}/ink`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":createId()},body:JSON.stringify({width:794,height:1123,formatVersion:2,coordinateSpace:"world",strokes:[],queueOcr:false,composition:{formatVersion:2,layout:"paper",paperWidth:794,writingExtent:1123,background,objects:[]}})});
    if(!response.ok){setError((await response.json()).error?.message||"Could not insert paper");return}
    setPaperPrompt(false);await load();setEditorMode("ink");setViewMode("write");
  }

  function chooseDrawingTool(tool:InkTool){if(!paperLayout){setActiveTool(tool);setPaperPrompt(true);return}setActiveTool(tool);setEditorMode("ink");setViewMode("write");setShowAnnotations(true)}
  function addPage(){if(!inkBlock)return;const composition={...inkBlock.composition!,writingExtent:(inkBlock.composition?.writingExtent||viewportHeight)+1123};setViewportHeight(composition.writingExtent);changeComposition(inkBlock,composition)}
  function placeText(){if(!inkBlock)return;const objects=inkBlock.composition?.objects||[];changeComposition(inkBlock,{...inkBlock.composition!,objects:[...objects,{id:createId(),type:"text",x:48,y:96,width:300,height:100,z:objects.length+1,markdown:"Type here"}]})}
  function updatePaper(background:Composition["background"]){if(inkBlock)changeComposition(inkBlock,{...inkBlock.composition!,background})}
  function moveSelectedObject(delta:number){if(!inkBlock||!selectedObjectId)return;changeComposition(inkBlock,{...inkBlock.composition!,objects:inkBlock.composition!.objects.map(object=>object.id===selectedObjectId?{...object,z:object.z+delta}:object)})}
  function nudgeObject(object:CompositionText,key:string){if(!inkBlock)return;const dx=key==="ArrowLeft"?-4:key==="ArrowRight"?4:0,dy=key==="ArrowUp"?-4:key==="ArrowDown"?4:0;changeComposition(inkBlock,{...inkBlock.composition!,objects:inkBlock.composition!.objects.map(entry=>entry.id===object.id?{...entry,x:Math.max(0,entry.x+dx),y:Math.max(0,entry.y+dy)}:entry)})}
  async function returnToFit(){
    if(overlayStrokes.length||(inkBlock?.composition?.objects.length||0)){setError("Remove paper ink and positioned text before returning to Fit screen.");return}
    if(inkBlock){const response=await fetch(`/api/v1/notes/${noteId}/blocks`),data=await response.json(),current=data.blocks?.find((block:Block)=>block.id===inkBlock.id);if(current)await remove(current)}
    setEditorMode("text");setViewMode("write");
  }

  async function keepLayout(block:Block){
    const composition:Composition={formatVersion:1,background:"blank",objects:[{id:createId(),type:"text",x:40,y:40,width:714,height:240,z:1,markdown:block.markdown}]};
    const response=await fetch(`/api/v1/notes/${noteId}/ink`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":createId()},body:JSON.stringify({width:794,height:320,formatVersion:2,coordinateSpace:"world",strokes:[],queueOcr:false,composition})});
    if(!response.ok){setError((await response.json()).error?.message||"Could not keep this layout");return}
    await fetch(`/api/v1/notes/${noteId}/blocks/${block.id}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:block.version})});
    await load();setEditorMode("ink");
  }

  function changeComposition(block:Block,composition:Composition){
    setBlocks(items=>items.map(item=>item.id===block.id?{...item,composition}:item));
    void saveInkWithRetry(noteId,{id:block.id,version:currentInkVersion.current,width:block.width||794,height:composition.writingExtent||block.height||1123,strokes:sanitizeStrokes(block.strokes),composition},fetch,createId).then(data=>{currentInkVersion.current=data.version??data.inkVersion??currentInkVersion.current+1;setBlocks(items=>items.map(item=>item.id===block.id?{...item,composition,inkVersion:currentInkVersion.current}:item));setError("")}).catch(reason=>setError(reason.message||"Composition save failed"));
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
    <div className={`integrated-note-editor mixed-note-editor editor-${editorMode} ${paletteCollapsed ? "tools-hidden" : ""} ${viewMode === "preview" ? "is-reading" : ""}`}>
      <div className="integrated-doc-container">
        <div className="integrated-doc-page portrait" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="mixed-editor-loading">Loading document…</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`integrated-note-editor mixed-note-editor editor-${editorMode} ${paletteCollapsed ? "tools-hidden" : ""} ${viewMode === "preview" ? "is-reading" : ""}`}>
      {error && (
        <div className="tutor-error" role="alert">
          {error}
          <button type="button" onClick={() => { void flushMarkdownSaves(); if (pendingStrokesRef.current) void saveInkStrokes(pendingStrokesRef.current, false); else if (!blocks.length) void load(); }}>Retry</button>
        </div>
      )}

      <div className={`integrated-floating-palette ${paletteCollapsed ? "collapsed" : ""}`} role="toolbar" aria-label="Note controls">
        {paletteCollapsed ? <button className="palette-expand-btn" onClick={() => collapseTools(false)} aria-label="Expand note controls" title="Expand note controls"><PencilLine size={18} /><CaretDown size={14} /></button> : <div className="palette-rows-container">
        <div className="palette-row">
          <div className="palette-group" aria-label="Note mode">
            <button type="button" className={editorMode === "text" && viewMode === "write" ? "active" : ""} onClick={() => { setEditorMode("text"); setViewMode("write"); }} aria-pressed={editorMode === "text" && viewMode === "write"}><TextT size={18}/><span>Write</span></button>
            <button type="button" className={editorMode === "ink" ? "active" : ""} onClick={() => chooseDrawingTool("pen")} aria-pressed={editorMode === "ink"}><PencilLine size={18}/><span>Handwrite</span></button>
            <button type="button" className={editorMode === "text" && viewMode === "preview" ? "active" : ""} onClick={() => { setEditorMode("text"); setViewMode("preview"); }} aria-pressed={editorMode === "text" && viewMode === "preview"}><Eye size={18}/><span>Read</span></button>
          </div>
          <div className="note-formatting-slot"/>
          <details className="note-toolbar-menu">
            <summary aria-label={`More note options${inkBlock ? `. Handwriting recognition ${inkBlock.ocrStatus||"pending"}` : ""}`} title="More note options"><DotsThree size={20} />{inkBlock&&<span className={`ocr-status-dot ${inkBlock.ocrStatus||"pending"}`} aria-hidden="true" />}</summary>
            <div>
              {inkBlock&&<p className="ocr-menu-status" role="status"><span>Handwriting recognition</span><strong>{inkBlock.ocrStatus||"pending"}</strong></p>}
              {inkBlock?.ocrStatus==="failed"&&<button type="button" onClick={()=>void retryOcr()}>Retry recognition</button>}
              {inkBlock&&<button type="button" aria-expanded={ocrPanelOpen} onClick={()=>{setOcrPanelOpen(open=>!open);setDismissedOcr(false)}}>{ocrPanelOpen?"Hide OCR review":"Review OCR"}</button>}
              {!paperLayout&&<button type="button" onClick={()=>setPaperPrompt(true)}><Plus size={18}/><span>Use paper</span></button>}
              {paperLayout&&<button type="button" onClick={addPage}><Plus size={18}/><span>Add page</span></button>}
              {paperLayout&&<button type="button" onClick={placeText}><TextT size={18}/><span>Place text</span></button>}
              {paperLayout&&<button type="button" onClick={()=>updatePaper("blank")}>Blank background</button>}
              {paperLayout&&<button type="button" onClick={()=>updatePaper("ruled")}>Ruled background</button>}
              {paperLayout&&<button type="button" onClick={()=>updatePaper("grid")}>Grid background</button>}
              {paperLayout&&selectedObjectId&&<button type="button" onClick={()=>moveSelectedObject(1)}>Bring forward</button>}
              {paperLayout&&selectedObjectId&&<button type="button" onClick={()=>moveSelectedObject(-1)}>Send backward</button>}
              {paperLayout&&<button type="button" onClick={returnToFit}><ArrowsIn size={18}/><span>Fit screen</span></button>}
              <button type="button" onClick={() => setShowAnnotations(v => !v)}>{showAnnotations ? <Eye size={18} /> : <EyeSlash size={18} />}<span>{showAnnotations ? "Hide ink" : "Show ink"}</span></button>
              <button type="button" onClick={() => { const container=docRef.current; if(container) { commitPageZoom(Math.min(1,(container.clientWidth-48)/viewportWidth)); setPageZoom(pageZoomRef.current); } }}>Fit page</button>
              {pageZoom !== 1 && <button type="button" onClick={resetPageZoom}><span>Reset zoom ({Math.round(pageZoom * 100)}%)</span></button>}
              {onToggleFullscreen && <button type="button" onClick={onToggleFullscreen}>{fullscreen ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}<span>{fullscreen ? "Exit fullscreen" : "Fullscreen"}</span></button>}
            </div>
          </details>
          <button type="button" onClick={() => collapseTools(true)} aria-label="Collapse note controls" title="Collapse note controls"><CaretUp size={18} /></button>
        </div>
            {editorMode === "ink" && (
              <div className="palette-row" ref={inkToolbarRef}>
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
                      aria-pressed={activeTool === "pen"}
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
                          <label htmlFor="note-pen-type">Pen type</label>
                          <select id="note-pen-type" aria-label="Pen type" value={activeTool} onChange={event=>{setActiveTool(event.target.value as InkTool);setPenOptionsOpen(false)}}>
                            <option value="pen">Pen</option><option value="highlighter">Highlighter</option>
                          </select>
                        </div>
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
                    aria-pressed={activeTool === "highlighter"}
                  >
                    <HighlighterCircle size={18} />
                  </button>
                  <button
                    className={activeTool === "eraser" ? "active" : ""}
                    onClick={() => { setActiveTool("eraser"); setPenOptionsOpen(false); }}
                    title="Eraser"
                    aria-label="Eraser tool"
                    aria-pressed={activeTool === "eraser"}
                  >
                    <Broom size={18} />
                  </button>
                  <button className={activeTool === "lasso" ? "active" : ""} onClick={() => chooseDrawingTool("lasso")} title="Lasso" aria-label="Lasso tool" aria-pressed={activeTool === "lasso"}><Selection size={18}/></button>
                </div>

                <div className="palette-group" aria-label="Shapes and ruler">
                  {([["ruler", "Ruler", Ruler], ["arrow", "Arrow", ArrowUpRight], ["rectangle", "Rectangle", Rectangle], ["ellipse", "Ellipse", Circle]] as const).map(([tool, label, Icon]) => <button type="button" key={tool} aria-label={`${label} tool`} title={label} aria-pressed={activeTool === tool} className={activeTool === tool ? "active" : ""} onClick={() => { setActiveTool(tool); setPenOptionsOpen(false); }}><Icon size={18}/></button>)}
                </div>
                <label className="ink-custom-color" title="Ink color"><span className="sr-only">Ink color</span><input type="color" aria-label="Ink color" value={color} onChange={event => setColor(event.target.value)}/></label>
                <label className="ink-width"><span className="sr-only">Stroke thickness</span><input type="range" aria-label="Stroke thickness" min="1" max="16" value={size} onChange={event => setSize(Number(event.target.value))}/><output>{size}px</output></label>
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
                    onClick={() => { setEditorMode("text"); setViewMode("write"); }}
                    title="Finish drawing (strokes are saved automatically)"
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
        <div className={`integrated-doc-page ${paperLayout?`paper-layout paper-${inkBlock?.composition?.background||"blank"}`:"fit-layout"}`} ref={pageRef} style={paperLayout?{width:794,minHeight:viewportHeight}:undefined}>
          <div className="integrated-doc-content" style={{position: "relative", zIndex: 1}}>
            {blocks.map((block) =>
              block.kind === "markdown" ? (
                <article className="note-block" key={block.id}>
                  <MarkdownBlock
                    block={block}
                    preview={viewMode === "preview"}
                    readOnly={editorMode === "ink"}
                    onSave={markdown}
                    onNavigateNote={onNavigateNote}
                  />
                  {editorMode==="ink"&&<button type="button" className="keep-layout-action" onClick={()=>void keepLayout(block)}>Keep layout to draw here</button>}
                </article>
              ) : block.composition?.layout==="paper" ? null : (
                <InkBlockView
                  key={block.id}
                  noteId={noteId}
                  block={block}
                  onMove={moveInk}
                  onDelete={remove}
                  onSaved={load}
                  onCompositionChange={changeComposition}
                />
              )
            )}
          </div>
          {paperLayout&&inkBlock&&<IntegratedOverlayCanvas width={794} height={viewportHeight} strokes={overlayStrokes} activeTool={activeTool} color={color} size={size} interactive={editorMode==="ink"} visible={showAnnotations} zoomRef={pageZoomRef} onChange={saveInkStrokes} onPinch={handleOverlayPinch} onGestureUndo={handleUndo}/>}
          {paperLayout&&inkBlock&&(inkBlock.composition?.objects||[]).map(object=><textarea key={object.id} className={`paper-positioned-text ${selectedObjectId===object.id?"selected":""}`} aria-label="Positioned text" value={object.markdown} style={{left:object.x,top:object.y,width:object.width,height:object.height,zIndex:3+object.z}} onFocus={()=>setSelectedObjectId(object.id)} onKeyDown={event=>{if(event.altKey&&event.key.startsWith("Arrow")){event.preventDefault();nudgeObject(object,event.key)}}} onChange={event=>setBlocks(items=>items.map(item=>item.id===inkBlock.id?{...item,composition:{...item.composition!,objects:item.composition!.objects.map(entry=>entry.id===object.id?{...entry,markdown:event.target.value}:entry)}}:item))} onBlur={event=>changeComposition(inkBlock,{...inkBlock.composition!,objects:inkBlock.composition!.objects.map(entry=>entry.id===object.id?{...entry,markdown:event.target.value,width:event.currentTarget.offsetWidth,height:event.currentTarget.offsetHeight}:entry)})}/>)}
        </div>
      </div>
      {paperPrompt&&<ModalDialog className="paper-choice-dialog" ariaLabel="Use Paper layout" onClose={()=>setPaperPrompt(false)}><div className="paper-choice-preview paper-grid" aria-hidden="true"/><h2>Use Paper layout?</h2><p>Paper keeps an A4 writing width so handwriting and typed text stay aligned on every device.</p><div className="dialog-actions"><button type="button" className="secondary" onClick={()=>setPaperPrompt(false)}>Cancel</button><button type="button" className="primary" onClick={()=>void activatePaper()}>Use paper</button></div></ModalDialog>}
    </div>
  );
}
