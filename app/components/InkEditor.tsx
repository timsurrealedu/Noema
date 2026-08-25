"use client";

import {createId} from "../lib/id";
import {useEffect, useRef, useState} from "react";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowUpRight,
  ArrowsIn,
  ArrowsOut,
  Broom,
  Circle,
  Copy,
  FloppyDisk,
  Hand,
  HighlighterCircle,
  PenNib,
  Ruler,
  Selection,
  Square,
  Trash
} from "@phosphor-icons/react";
import {
  acceptInkPointer,
  applyPinch,
  eraseAt,
  fitInkView,
  panBy,
  penRecentlyUp,
  zoomAtPoint,
  InkPoint,
  InkStroke,
  InkTool,
  rotateStroke,
  saveInkWithRetry,
  sanitizeStrokes,
  scaleStroke,
  screenToWorld,
  selectionBounds,
  snapInkPoint,
  strokePath,
  toInkDocument,
  translateStroke
} from "../lib/ink";
import {deleteInkDraft, loadInkDraft, saveInkDraft} from "../lib/offlineQueue";

type Props = {
  id: string;
  noteId?: string;
  width?: number;
  height?: number;
  strokes?: InkStroke[];
  version?: number;
  transcript?: string;
  ocrStatus?: string;
  capture?: boolean;
  showTranscript?: boolean;
  onChange?: (strokes: InkStroke[]) => void;
  onSaved?: () => void;
};

export function InkEditor({
  id,
  noteId = id,
  width = 900,
  height = 420,
  strokes: initial = [],
  version = 0,
  transcript = "",
  ocrStatus = "pending",
  capture = false,
  showTranscript = false,
  onChange,
  onSaved = () => {}
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const active = useRef<InkStroke | null>(null);
  const lasso = useRef<InkPoint | null>(null);
  const pan = useRef<{x: number; y: number} | null>(null);
  const drag = useRef<{
    mode: "move" | "scale" | "rotate";
    start: InkPoint;
    original: InkStroke[];
    next: InkStroke[];
    cx?: number;
    cy?: number;
  } | null>(null);
  const penActive = useRef(false);
  const penUpAt = useRef(0);
  const isErasing = useRef(false);
  const touches = useRef(new Map<number, {x: number; y: number}>());
  const pinchDistance = useRef(0);
  const pinchCenter = useRef({x: 0, y: 0});
  const lastTwoTap = useRef(0);
  const drawFrame = useRef<number | null>(null);
  const liveStrokes = useRef<InkStroke[]>([]);

  const [fullScreen, setFullScreen] = useState(false);
  const [view, setView] = useState({x: 0, y: 0, zoom: 1});
  const [strokes, setStrokes] = useState(() => sanitizeStrokes(initial));
  const [selected, setSelected] = useState<string[]>([]);
  const cmdStack = useRef<{type:"add"|"erase"|"clear"|"transform"|"delete"; before:InkStroke[]; after:InkStroke[]}[]>([]);
  const cmdRedoStack = useRef<{type:"add"|"erase"|"clear"|"transform"|"delete"; before:InkStroke[]; after:InkStroke[]}[]>([]);
  const beforeSnapshot = useRef<InkStroke[] | null>(null);
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.dataset.theme || localStorage.getItem("noema-theme") || "dark";
    }
    return "dark";
  });
  const [tool, setTool] = useState<InkTool>("pen");
  const [penOptionsOpen, setPenOptionsOpen] = useState(false);
  const [color, setColor] = useState(() => {
    if (typeof window !== "undefined") {
      const current = document.documentElement.dataset.theme || localStorage.getItem("noema-theme");
      if (current === "light") return "#000000";
      if (current === "dark") return "#ffffff";
    }
    return "#000000";
  });
  const [size, setSize] = useState(3);
  const [canvasSize, setCanvasSize] = useState({width, height});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [text, setText] = useState(transcript);

  const bounds = selectionBounds(strokes, selected);

  const userInteracted = useRef(false);

  useEffect(() => {
    liveStrokes.current = strokes;
  }, [strokes]);

  useEffect(() => () => {
    if (drawFrame.current !== null) cancelAnimationFrame(drawFrame.current);
  }, []);

  const undoRef = useRef(undo);
  const redoStrokeRef = useRef(redoStroke);
  undoRef.current = undo;
  redoStrokeRef.current = redoStroke;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redoStrokeRef.current(); else undoRef.current();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redoStrokeRef.current(); }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateTheme = () => {
      const current = document.documentElement.dataset.theme || localStorage.getItem("noema-theme") || "dark";
      setTheme(current);
      const isLight = current === "light" || capture;
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
  }, [capture]);

  useEffect(() => {
    loadInkDraft(id)
      .then(draft => {
        const replay = sanitizeStrokes(draft?.strokes);
        if (replay.length) {
          setStrokes(replay);
          onChange?.(replay);
        }
      })
      .catch(() => {});
  }, [id, onChange]);

  useEffect(() => {
    if (!strokes.length || !canvasSize.width || !canvasSize.height || userInteracted.current) return;
    setView(fitInkView(strokes, canvasSize.width, canvasSize.height));
  }, [strokes, canvasSize.width, canvasSize.height]);

  useEffect(() => {
    const updateSize = () => {
      const element = svg.current;
      if (!element) return;
      // Measure the rendered canvas itself, never a parent minus assumed chrome:
      // deriving height from the container feeds back through layout and makes
      // the canvas grow/shrink on every ResizeObserver tick.
      const rect = element.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 0 && h > 0) {
        setCanvasSize(current => current.width === w && current.height === h ? current : {width: w, height: h});
      }
    };
    updateSize();
    if (!svg.current) return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);

  function persist(next: InkStroke[]) {
    liveStrokes.current = next;
    setStrokes(next);
    onChange?.(next);
    void saveInkDraft({
      id,
      noteId,
      width: canvasSize.width,
      height: canvasSize.height,
      strokes: next
    });
  }

  function scheduleStrokeRender() {
    if (drawFrame.current !== null) return;
    drawFrame.current = requestAnimationFrame(() => {
      drawFrame.current = null;
      setStrokes(liveStrokes.current);
    });
  }

  function point(event: React.PointerEvent<SVGSVGElement> | PointerEvent) {
    const element = svg.current!;
    // Browser-derived mapping stays glued to the pen tip at any zoom level;
    // fall back to rect math only if getScreenCTM is unavailable.
    const ctm = element.getScreenCTM();
    const base = ctm
      ? (() => { const mapped = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse()); return {x: mapped.x, y: mapped.y}; })()
      : screenToWorld(event.clientX, event.clientY, element.getBoundingClientRect(), view, canvasSize.width, canvasSize.height);
    return {
      ...base,
      pressure: event.pressure > 0 ? event.pressure : event.pointerType === "pen" ? 0.5 : 1,
      time: event.timeStamp,
      tiltX: Number(event.tiltX) || 0,
      tiltY: Number(event.tiltY) || 0
    };
  }

  function startTransform(event: React.PointerEvent<SVGCircleElement>, mode: "scale" | "rotate") {
    event.stopPropagation();
    if (!bounds) return;
    svg.current?.setPointerCapture(event.pointerId);
    drag.current = {
      mode,
      start: point(event.nativeEvent),
      original: strokes,
      next: strokes,
      cx: bounds.cx,
      cy: bounds.cy
    };
  }

  function cmdSnapshot() { return liveStrokes.current.map(s => ({...s, points: [...s.points]})); }

  function cmdPush(type:"add"|"erase"|"clear"|"transform"|"delete", before:InkStroke[], after:InkStroke[]) {
    cmdStack.current.push({type, before, after});
    if (cmdStack.current.length > 50) cmdStack.current.shift();
    cmdRedoStack.current = [];
  }

  function down(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType==="touch") {
      if (penRecentlyUp(event.pointerType, penActive.current, penUpAt.current)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      touches.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (touches.current.size===2) {
        const [a, b] = [...touches.current.values()];
        const now = Date.now();
        if (now - lastTwoTap.current < 350) undo();
        lastTwoTap.current = now;
        pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
        pinchCenter.current = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
        if (active.current) {
          active.current = null;
          setStrokes(items => items.slice(0, -1));
        }
        userInteracted.current = true;
        return;
      }
      return;
    }
    if (!acceptInkPointer(event.pointerType, penActive.current)) return;
    if (event.pointerType==="pen") penActive.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const first = point(event);
    if (tool === "pan") {
      userInteracted.current = true;
      pan.current = {x: event.clientX, y: event.clientY};
      return;
    }
    if (tool === "eraser") {
      beforeSnapshot.current = cmdSnapshot();
      isErasing.current = true;
      persist(eraseAt(strokes, first, Math.max(12, size * 5) / view.zoom));
      return;
    }
    if (tool === "lasso") {
      const hit =
        selected.length &&
        strokes.some(
          stroke =>
            selected.includes(stroke.id) &&
            stroke.points.some(item => Math.hypot(item.x - first.x, item.y - first.y) < 12 / view.zoom)
        );
      if (hit) {
        beforeSnapshot.current = cmdSnapshot();
        drag.current = {mode: "move", start: first, original: strokes, next: strokes};
        return;
      }
      lasso.current = first;
      return;
    }
    userInteracted.current = true;
    beforeSnapshot.current = cmdSnapshot();
    active.current = {id: createId(), tool, color, width: size, points: [first]};
    liveStrokes.current = [...strokes, active.current];
    setStrokes(liveStrokes.current);
  }

  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType==="touch") {
      const previous = touches.current.get(event.pointerId);
      if (!previous) return;
      touches.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const center = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
        const previousCenter = pinchCenter.current;
        const distRatio = distance / Math.max(1, pinchDistance.current);
        pinchDistance.current = distance;
        pinchCenter.current = center;
        userInteracted.current = true;
        setView(val => {
          const rect = svg.current?.getBoundingClientRect();
          if (!rect) return val;
          return applyPinch(val, rect, canvasSize.width, canvasSize.height, previousCenter, center, distRatio);
        });
        return;
      }
      return;
    }
    if (pan.current) {
      const dx = event.clientX - pan.current.x;
      const dy = event.clientY - pan.current.y;
      pan.current = {x: event.clientX, y: event.clientY};
      userInteracted.current = true;
      setView(val => panBy(val, dx, dy));
      return;
    }
    if (tool === "eraser" && isErasing.current) {
      const pts = (event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent]).map(item => point(item));
      let updated = strokes;
      for (const p of pts) {
        updated = eraseAt(updated, p, Math.max(12, size * 5) / view.zoom);
      }
      if (updated !== strokes) {
        persist(updated);
      }
      return;
    }
    const next = point(event);
    if (drag.current) {
      const item = drag.current;
      const cx = item.cx || 0;
      const cy = item.cy || 0;
      const startDistance = Math.max(1, Math.hypot(item.start.x - cx, item.start.y - cy));
      const scale = Math.max(0.1, Math.hypot(next.x - cx, next.y - cy) / startDistance);
      const angle =
        Math.atan2(next.y - cy, next.x - cx) - Math.atan2(item.start.y - cy, item.start.x - cx);
      item.next = item.original.map(stroke =>
        !selected.includes(stroke.id)
          ? stroke
          : item.mode === "move"
          ? translateStroke(stroke, next.x - item.start.x, next.y - item.start.y)
          : item.mode === "scale"
          ? scaleStroke(stroke, scale, scale, {...item.start, x: cx, y: cy})
          : rotateStroke(stroke, angle, {...item.start, x: cx, y: cy})
      );
      setStrokes(item.next);
      return;
    }
    if (!active.current) return;
    const points = (event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent]).map(item =>
      point(item)
    );
    active.current = {
      ...active.current,
      points:
        active.current.tool === "ruler"
          ? [active.current.points[0], snapInkPoint(active.current.points[0], points.at(-1)!)]
          : [...active.current.points, ...points]
    };
    liveStrokes.current = [...liveStrokes.current.slice(0, -1), active.current!];
    scheduleStrokeRender();
  }

  function up(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType==="touch") {
      touches.current.delete(event.pointerId);
      return;
    }
    if (isErasing.current) {
      isErasing.current = false;
      if (beforeSnapshot.current) { cmdPush("erase", beforeSnapshot.current, cmdSnapshot()); beforeSnapshot.current = null; }
    }
    if (active.current) {
      active.current = null;
      const nextStrokes = liveStrokes.current;
      persist(nextStrokes);
      if (beforeSnapshot.current) { cmdPush("add", beforeSnapshot.current, cmdSnapshot()); beforeSnapshot.current = null; }

    }
    if (drag.current) {
      const after = drag.current.next;
      persist(after);
      if (beforeSnapshot.current) { cmdPush("transform", beforeSnapshot.current, cmdSnapshot()); beforeSnapshot.current = null; }
      drag.current = null;
    }
    if (lasso.current) {
      const end = point(event);
      const left = Math.min(lasso.current.x, end.x);
      const right = Math.max(lasso.current.x, end.x);
      const top = Math.min(lasso.current.y, end.y);
      const bottom = Math.max(lasso.current.y, end.y);
      setSelected(
        strokes
          .filter(stroke =>
            stroke.points.some(
              item => item.x >= left && item.x <= right && item.y >= top && item.y <= bottom
            )
          )
          .map(stroke => stroke.id)
      );
      lasso.current = null;
    }
    pan.current = null;
    if (event.pointerType==="pen") {
      penActive.current = false;
      penUpAt.current = performance.now();
    }
  }

  function wheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    userInteracted.current = true;
    setView(val =>
      zoomAtPoint(
        val,
        event.currentTarget.getBoundingClientRect(),
        canvasSize.width,
        canvasSize.height,
        event.clientX,
        event.clientY,
        Math.exp(-event.deltaY * 0.0015)
      )
    );
  }

  function undo() {
    const cmd = cmdStack.current.pop();
    if (!cmd) return;
    cmdRedoStack.current.push(cmd);
    persist(cmd.before);
  }

  function redoStroke() {
    const cmd = cmdRedoStack.current.pop();
    if (!cmd) return;
    cmdStack.current.push(cmd);
    persist(cmd.after);
  }

  function clearCanvas() {
    if (!strokes.length) return;
    const before = cmdSnapshot();
    cmdPush("clear", before, []);
    persist([]);
    setSelected([]);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      // Strokes live in an unbounded world space (pan/zoom offsets make
      // coordinates negative or larger than the canvas). Normalize into a
      // padded positive document so the server's bounds check always passes.
      const ink = toInkDocument(strokes);
      await saveInkWithRetry(noteId, {
          id,
          formatVersion: ink.formatVersion,
          coordinateSpace: ink.coordinateSpace,
          width: ink.width,
          height: ink.height,
          strokes: ink.strokes,
          version
      }, fetch, createId);
      await deleteInkDraft(id);
      setMessage("Saved · OCR queued");
      onSaved();
    } catch (error) {
      setMessage((error as Error).message || "Saved offline");
    } finally {
      setSaving(false);
    }
  }

  async function saveTranscript() {
    const response = await fetch(`/api/v1/ink/${id}/transcript`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({transcript: text, equations: [], version})
    });
    if (response.ok) {
      setMessage("Transcript indexed");
      onSaved();
    } else {
      setMessage((await response.json()).error?.message || "Transcript save failed");
    }
  }

  const toolList = [
    ["pen","Pen",PenNib],
    ["highlighter","Highlighter",HighlighterCircle],
    ["eraser","Eraser",Trash],
    ["lasso","Select",Selection],
    ["pan","Pan",Hand],
    ["ruler","Ruler",Ruler],
    ["rectangle","Rectangle",Square],
    ["ellipse","Ellipse",Circle],
    ["arrow","Arrow",ArrowUpRight]
  ] as const;

  return (
    <section
      ref={containerRef}
      className={`ink-workspace ${fullScreen ? "full-screen-ink-workspace" : ""}`}
      aria-label="Handwriting block"
    >
      <div className="ink-toolbar" role="toolbar" aria-label="Ink tools">
        {toolList.map(([name, label, Icon]) => {
          const isPen = name === "pen";
          const isActive = tool === name;
          return (
            <div key={name} className="pen-tool-wrapper">
              <button
                type="button"
                className={isActive ? "active" : ""}
                aria-pressed={isActive}
                aria-label={`${label}${isPen ? " (Double-click for options)" : ""}`}
                title={`${label}${isPen ? " (Double click to customize ink)" : ""}`}
                onClick={() => {
                  if (isActive && isPen) {
                    setPenOptionsOpen(open => !open);
                  } else {
                    setTool(name as InkTool);
                    if (!isPen) setPenOptionsOpen(false);
                  }
                }}
                onDoubleClick={() => {
                  if (isPen) {
                    setTool("pen");
                    setPenOptionsOpen(true);
                  }
                }}
              >
                <Icon />
                {isPen && (
                  <span
                    className="pen-color-dot"
                    style={{backgroundColor: color === "#000000" && theme === "dark" ? "#ffffff" : color}}
                  />
                )}
              </button>

              {isPen && penOptionsOpen && (
                <div className="pen-options-popover" role="dialog" aria-label="Pen Options">
                  <header>
                    <span>Pen Settings</span>
                    <button type="button" className="close-btn icon-button" onClick={() => setPenOptionsOpen(false)}>×</button>
                  </header>
                  <div className="popover-section">
                    <label>Colors</label>
                    <div className="ink-color-presets" role="group" aria-label="Ink color presets">
                      {[
                        { id: "default", name: (theme === "light" || capture) ? "Black (Theme default)" : "White (Theme default)", value: (theme === "light" || capture) ? "#000000" : "#ffffff" },
                        { id: "red", name: "Red", value: "#ef4444" },
                        { id: "blue", name: "Blue", value: "#3b82f6" },
                        { id: "green", name: "Green", value: "#22c55e" },
                        { id: "yellow", name: "Yellow", value: "#eab308" }
                      ].map(p => {
                        const isDefaultPill = p.id === "default";
                        const isSwatchActive = isDefaultPill
                          ? (color === "#000000" || color === "#ffffff" || color === "#1e293b" || color === "#0f172a" || color === "#f8fafc")
                          : color === p.value;
                        return (
                          <button
                            type="button"
                            key={p.id}
                            title={p.name}
                            aria-label={p.name}
                            className={`color-swatch-btn ${isSwatchActive ? "active" : ""}`}
                            style={{
                              backgroundColor: p.value,
                              borderColor: isSwatchActive ? "var(--primary, #0284c7)" : (p.value === "#ffffff" ? "#cbd5e1" : p.value)
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
                      max="28"
                      value={size}
                      onChange={event => setSize(Number(event.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          aria-label="Fit drawing"
          onClick={() => {
            userInteracted.current = false;
            setView(fitInkView(strokes, canvasSize.width, canvasSize.height));
          }}
        >
          Fit
        </button>
        <output aria-label="Canvas zoom">{Math.round(view.zoom * 100)}%</output>
        {selected.length > 0 && (
          <>
            <button
              type="button"
              aria-label="Duplicate selection"
              onClick={() =>
                persist([
                  ...strokes,
                  ...strokes
                    .filter(stroke => selected.includes(stroke.id))
                    .map(stroke => ({
                      ...stroke,
                      id: createId(),
                      points: stroke.points.map(pt => ({...pt, x: pt.x + 12, y: pt.y + 12}))
                    }))
                ])
              }
            >
              <Copy />
            </button>
            <button
              type="button"
              aria-label="Scale selection"
              onClick={() => {
                const before = cmdSnapshot();
                persist(
                  strokes.map(stroke => (selected.includes(stroke.id) ? scaleStroke(stroke, 1.1) : stroke))
                );
                cmdPush("transform", before, cmdSnapshot());
              }}
            >
              Scale
            </button>
            <button
              type="button"
              aria-label="Rotate selection"
              onClick={() => {
                const before = cmdSnapshot();
                persist(
                  strokes.map(stroke =>
                    selected.includes(stroke.id) ? rotateStroke(stroke, Math.PI / 12) : stroke
                  )
                );
                cmdPush("transform", before, cmdSnapshot());
              }}
            >
              Rotate
            </button>
            <button
              type="button"
              aria-label="Ruler snap"
              onClick={() => {
                const before = cmdSnapshot();
                persist(
                  strokes.map(stroke =>
                    selected.includes(stroke.id)
                      ? {
                          ...stroke,
                          points: stroke.points.map((pt, idx) =>
                            idx ? {...pt, y: stroke.points[0].y} : pt
                          )
                        }
                      : stroke
                  )
                );
                cmdPush("transform", before, cmdSnapshot());
              }}
            >
              Ruler snap
            </button>
            <button
              type="button"
              aria-label="Delete selection"
              onClick={() => {
                const before = cmdSnapshot();
                persist(strokes.filter(stroke => !selected.includes(stroke.id)));
                setSelected([]);
                cmdPush("delete", before, cmdSnapshot());
              }}
            >
              <Trash />
            </button>
          </>
        )}
        <button type="button" aria-label="Undo" disabled={!cmdStack.current.length} onClick={undo}>
          <ArrowCounterClockwise />
        </button>
        <button type="button" aria-label="Redo" disabled={!cmdRedoStack.current.length} onClick={redoStroke}>
          <ArrowClockwise />
        </button>
        <button
          type="button"
          aria-label="Clear canvas"
          title="Clear canvas"
          disabled={!strokes.length}
          onClick={clearCanvas}
        >
          <Broom />
        </button>
        <button
          type="button"
          aria-label={fullScreen ? "Exit full screen" : "Full screen canvas"}
          title={fullScreen ? "Exit full screen" : "Full screen canvas"}
          onClick={() => setFullScreen(!fullScreen)}
        >
          {fullScreen ? <ArrowsIn /> : <ArrowsOut />}
        </button>
        {!capture && (
          <button type="button" className="primary" disabled={saving} onClick={save}>
            <FloppyDisk />
            {saving ? "Saving…" : "Save ink"}
          </button>
        )}
      </div>
      <svg
        ref={svg}
        className="ink-canvas"
        viewBox={`${view.x} ${view.y} ${canvasSize.width / view.zoom} ${canvasSize.height / view.zoom}`}
        role="img"
        aria-label="Pressure-aware handwriting canvas"
        onWheel={wheel}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {strokes
          .filter(stroke => stroke.tool !== "eraser")
          .map(stroke => {
            const isDarkCanvas = theme === "dark" && !capture;
            const norm = (stroke.color || "").toLowerCase().trim();
            const displayColor = isDarkCanvas
              ? (norm === "#000000" || norm === "#000" || norm === "#1e293b" || norm === "#0f172a" || norm === "black" ? "#ffffff" : stroke.color)
              : (norm === "#ffffff" || norm === "#fff" || norm === "#f8fafc" || norm === "white" ? "#000000" : stroke.color);
            return (
              <path
                key={stroke.id}
                d={strokePath(stroke)}
                fill="none"
                stroke={displayColor}
                strokeWidth={stroke.width}
                opacity={
                  selected.includes(stroke.id) ? 0.5 : stroke.tool === "highlighter" ? 0.35 : 1
                }
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        {bounds && tool === "lasso" && (
          <g className="ink-selection">
            <rect
              x={bounds.left}
              y={bounds.top}
              width={bounds.right - bounds.left}
              height={bounds.bottom - bounds.top}
            />
            <circle
              aria-label="Rotate selection handle"
              cx={bounds.cx}
              cy={bounds.top - 24 / view.zoom}
              r={9 / view.zoom}
              onPointerDown={event => startTransform(event,"rotate")}
            />
            <circle
              aria-label="Scale selection handle"
              cx={bounds.right}
              cy={bounds.bottom}
              r={9 / view.zoom}
              onPointerDown={event => startTransform(event,"scale")}
            />
          </g>
        )}
      </svg>
      {showTranscript && !capture && (
        <div className="ink-transcript">
          <label>
            OCR transcript <small>{ocrStatus}</small>
            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="OCR appears here; strokes remain authoritative."
            />
          </label>
          <button className="secondary" onClick={saveTranscript}>
            Save correction
          </button>
          {message && <span role="status">{message}</span>}
        </div>
      )}
    </section>
  );
}
