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
  eraseAt,
  fitInkView,
  InkPoint,
  InkStroke,
  InkTool,
  rotateStroke,
  sanitizeStrokes,
  scaleStroke,
  screenToWorld,
  selectionBounds,
  snapInkPoint,
  strokePath,
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

  const [fullScreen, setFullScreen] = useState(false);
  const [view, setView] = useState({x: 0, y: 0, zoom: 1});
  const [strokes, setStrokes] = useState(() => sanitizeStrokes(initial));
  const [redo, setRedo] = useState<InkStroke[][]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [tool, setTool] = useState<InkTool>("pen");
  const [color, setColor] = useState("#1e293b");
  const [size, setSize] = useState(3);
  const [canvasSize, setCanvasSize] = useState({width, height});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [text, setText] = useState(transcript);

  const bounds = selectionBounds(strokes, selected);

  const userInteracted = useRef(false);

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
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = Math.max(300, Math.floor(rect.width));
        const h = Math.max(200, Math.floor(rect.height - (capture ? 46 : 110)));
        if (w > 0 && h > 0) setCanvasSize({width: w, height: h});
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [capture]);

  function persist(next: InkStroke[]) {
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

  function point(event: React.PointerEvent<SVGSVGElement> | PointerEvent) {
    const base = screenToWorld(
      event.clientX,
      event.clientY,
      svg.current!.getBoundingClientRect(),
      view,
      canvasSize.width,
      canvasSize.height
    );
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

  function down(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType==="touch") {
      if (penActive.current || performance.now() - penUpAt.current < 150) return;
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
        return;
      }
    }
    if (!acceptInkPointer(event.pointerType, penActive.current)) return;
    if (event.pointerType==="pen") penActive.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const first = point(event);
    if (tool === "pan") {
      pan.current = {x: event.clientX, y: event.clientY};
      return;
    }
    if (tool === "eraser") {
      isErasing.current = true;
      persist(eraseAt(strokes, first, Math.max(12, size * 5) / view.zoom));
      setRedo([]);
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
        drag.current = {mode: "move", start: first, original: strokes, next: strokes};
        return;
      }
      lasso.current = first;
      return;
    }
    active.current = {id: createId(), tool, color, width: size, points: [first]};
    setStrokes([...strokes, active.current]);
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
        const centerDx = center.x - pinchCenter.current.x;
        const centerDy = center.y - pinchCenter.current.y;
        const distRatio = distance / Math.max(1, pinchDistance.current);
        pinchDistance.current = distance;
        pinchCenter.current = center;
        setView(val => ({
          x: val.x - centerDx / val.zoom,
          y: val.y - centerDy / val.zoom,
          zoom: Math.max(0.25, Math.min(4, val.zoom * distRatio))
        }));
        return;
      }
    }
    if (pan.current) {
      const dx = event.clientX - pan.current.x;
      const dy = event.clientY - pan.current.y;
      pan.current = {x: event.clientX, y: event.clientY};
      setView(val => ({
        ...val,
        x: val.x - dx / val.zoom,
        y: val.y - dy / val.zoom
      }));
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
    setStrokes(items => [...items.slice(0, -1), active.current!]);
  }

  function up(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType==="touch") {
      touches.current.delete(event.pointerId);
      if (touches.current.size) return;
    }
    if (isErasing.current) {
      isErasing.current = false;
    }
    if (active.current) {
      const drawn = active.current;
      active.current = null;
      const nextStrokes = strokes;
      persist(nextStrokes);
      setRedo([]);

      const minX = view.x + 20 / view.zoom;
      const maxX = view.x + canvasSize.width / view.zoom - 20 / view.zoom;
      const minY = view.y + 20 / view.zoom;
      const maxY = view.y + canvasSize.height / view.zoom - 20 / view.zoom;

      const extendsBoundary = drawn.points.some(
        p => p.x <= minX || p.x >= maxX || p.y <= minY || p.y >= maxY
      );

      if (extendsBoundary && nextStrokes.length > 0) {
        setView(fitInkView(nextStrokes, canvasSize.width, canvasSize.height));
      }
    }
    if (drag.current) {
      persist(drag.current.next);
      drag.current = null;
      setRedo([]);
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
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = screenToWorld(
      event.clientX,
      event.clientY,
      rect,
      view,
      canvasSize.width,
      canvasSize.height
    );
    const zoom = Math.max(
      0.25,
      Math.min(4, view.zoom * Math.exp(-event.deltaY * 0.0015))
    );
    const sx = ((event.clientX - rect.left) / rect.width) * canvasSize.width;
    const sy = ((event.clientY - rect.top) / rect.height) * canvasSize.height;
    setView({x: anchor.x - sx / zoom, y: anchor.y - sy / zoom, zoom});
  }

  function undo() {
    if (!strokes.length) return;
    setRedo(items => [...items, strokes]);
    persist(strokes.slice(0, -1));
  }

  function redoStroke() {
    const next = redo.at(-1);
    if (!next) return;
    persist(next);
    setRedo(items => items.slice(0, -1));
  }

  function clearCanvas() {
    if (!strokes.length) return;
    setRedo(items => [...items, strokes]);
    persist([]);
    setSelected([]);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/notes/${noteId}/ink`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Idempotency-Key": createId()},
        body: JSON.stringify({
          id,
          formatVersion: 2,
          coordinateSpace: "world",
          width: canvasSize.width,
          height: canvasSize.height,
          strokes,
          version
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Ink save failed");
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
        {toolList.map(([name, label, Icon]) => (
          <button
            type="button"
            key={name}
            className={tool === name ? "active" : ""}
            aria-pressed={tool === name}
            aria-label={label}
            onClick={() => setTool(name as InkTool)}
          >
            <Icon />
          </button>
        ))}
        <input
          type="color"
          aria-label="Ink color"
          value={color}
          onChange={event => setColor(event.target.value)}
        />
        <label>
          Width
          <input
            type="range"
            min="1"
            max="28"
            value={size}
            onChange={event => setSize(Number(event.target.value))}
          />
        </label>
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
              onClick={() =>
                persist(
                  strokes.map(stroke => (selected.includes(stroke.id) ? scaleStroke(stroke, 1.1) : stroke))
                )
              }
            >
              Scale
            </button>
            <button
              type="button"
              aria-label="Rotate selection"
              onClick={() =>
                persist(
                  strokes.map(stroke =>
                    selected.includes(stroke.id) ? rotateStroke(stroke, Math.PI / 12) : stroke
                  )
                )
              }
            >
              Rotate
            </button>
            <button
              type="button"
              aria-label="Ruler snap"
              onClick={() =>
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
                )
              }
            >
              Ruler snap
            </button>
            <button
              type="button"
              aria-label="Delete selection"
              onClick={() => {
                persist(strokes.filter(stroke => !selected.includes(stroke.id)));
                setSelected([]);
              }}
            >
              <Trash />
            </button>
          </>
        )}
        <button type="button" aria-label="Undo" disabled={!strokes.length} onClick={undo}>
          <ArrowCounterClockwise />
        </button>
        <button type="button" aria-label="Redo" disabled={!redo.length} onClick={redoStroke}>
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
        style={{aspectRatio: `${canvasSize.width}/${canvasSize.height}`}}
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
          .map(stroke => (
            <path
              key={stroke.id}
              d={strokePath(stroke)}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              opacity={
                selected.includes(stroke.id) ? 0.5 : stroke.tool === "highlighter" ? 0.35 : 1
              }
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
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
