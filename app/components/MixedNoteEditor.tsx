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
  eraseAt,
  InkPoint,
  InkStroke,
  InkTool,
  sanitizeStrokes,
  strokePath
} from "../lib/ink";
import {MarkdownContent} from "./MarkdownContent";
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
  taskProposals?: {id: string; text: string; state: string}[];
};

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
      {!preview ? <LiveMarkdownEditor value={value} onChange={setValue} onBlur={() => value !== block.markdown && onSave(block, value)} /> : <article className="markdown-preview block-preview"><MarkdownContent text={value} onNavigateNote={onNavigateNote} /></article>}
    </div>
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
  onChange: (nextStrokes: InkStroke[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const activeStroke = useRef<InkStroke | null>(null);
  const [currentStrokes, setCurrentStrokes] = useState<InkStroke[]>(strokes);
  const liveStrokes = useRef<InkStroke[]>(strokes);

  useEffect(() => {
    setCurrentStrokes(strokes);
    liveStrokes.current = strokes;
  }, [strokes]);

  if (!visible) return null;

  function getPoint(event: React.PointerEvent<SVGSVGElement>): InkPoint | null {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      pressure: event.pressure > 0 ? event.pressure : 0.5,
      time: event.timeStamp,
      tiltX: Number(event.tiltX) || 0,
      tiltY: Number(event.tiltY) || 0
    };
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!interactive) return;
    const pt = getPoint(event);
    if (!pt) return;
    drawing.current = true;
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
    const pt = getPoint(event);
    if (!pt) return;

    if (activeTool === "eraser") {
      const erased = eraseAt(liveStrokes.current, pt, size * 4);
      liveStrokes.current = erased;
      setCurrentStrokes(erased);
      onChange(erased);
      return;
    }

    if (activeStroke.current) {
      const updated = {
        ...activeStroke.current,
        points: [...activeStroke.current.points, pt]
      };
      activeStroke.current = updated;
      liveStrokes.current = liveStrokes.current.map(stroke => stroke.id === updated.id ? updated : stroke);
      setCurrentStrokes(liveStrokes.current);
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current) return;
    drawing.current = false;

    if (activeStroke.current) {
      const finalStroke = activeStroke.current;
      activeStroke.current = null;
      const next = liveStrokes.current.map(stroke => stroke.id === finalStroke.id ? finalStroke : stroke);
      liveStrokes.current = next;
      onChange(next);
    }
  }

  return (
    <svg
      ref={svgRef}
      className={`integrated-ink-overlay ${interactive ? "mode-ink" : "mode-text"}`}
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

export function MixedNoteEditor({
  noteId,
  initialContent = "",
  initialInk = false,
  onNavigateNote,
  fullscreen,
  onToggleFullscreen
}: {
  noteId: string;
  initialContent?: string;
  initialInk?: boolean;
  onNavigateNote?: (target: string) => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const startedInk = useRef(false);
  const docRef = useRef<HTMLDivElement>(null);

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
    if (typeof window !== "undefined" && window.innerWidth <= 600) {
      return "preview";
    }
    return "preview";
  });
  const [editorMode, setEditorMode] = useState<"text" | "ink">(initialInk ? "ink" : "text");
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
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);

  const inkBlock = blocks.find(b => b.kind === "ink");
  const overlayStrokes = useMemo(() => sanitizeStrokes(inkBlock?.strokes || []), [inkBlock?.strokes]);

  async function load() {
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
    load().catch(reason => {
      setError(reason.message);
      setLoading(false);
    });
  }, [noteId]);

  useEffect(() => {
    if (initialInk && !loading && !startedInk.current) {
      startedInk.current = true;
      setEditorMode("ink");
    }
  }, [initialInk, loading]);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (pageRef.current) {
          const scrollH = pageRef.current.scrollHeight || 0;
          const contentH = entry.contentRect ? Math.floor(entry.contentRect.height) : 0;
          setViewportWidth(Math.floor(pageRef.current.getBoundingClientRect().width));
          setViewportHeight(Math.max(500, scrollH, contentH));
        }
      }
    });
    observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [blocks, orientation]);

  const currentInkVersion = useRef<number>(inkBlock?.inkVersion || 0);
  const savingInkRef = useRef<boolean>(false);
  const pendingStrokesRef = useRef<InkStroke[] | null>(null);

  useEffect(() => {
    if (inkBlock?.inkVersion !== undefined) {
      currentInkVersion.current = inkBlock.inkVersion;
    }
  }, [inkBlock?.inkVersion]);

  async function saveInkStrokes(nextStrokes: InkStroke[]) {
    setUndoStack(prev => [...prev, overlayStrokes]);
    setRedoStack([]);
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
    void saveInkStrokes(previous);
  }

  function handleRedo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, overlayStrokes]);
    setRedoStack(prev => prev.slice(0, -1));
    void saveInkStrokes(next);
  }

  function handleClearInk() {
    if (!overlayStrokes.length) return;
    void saveInkStrokes([]);
  }

  async function markdown(block: Block, value: string) {
    setBlocks(items => items.map(item => (item.id === block.id ? {...item, markdown: value} : item)));
    const response = await fetch(`/api/v1/notes/${noteId}/blocks/${block.id}`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({markdown: value, version: block.version})
    });
    if (response.ok) await load();
    else setError((await response.json()).error?.message || "Save failed");
  }

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

  const markdownBlocks = blocks.filter(b => b.kind === "markdown");

  return (
    <div className="integrated-note-editor mixed-note-editor">
      {error && (
        <div className="tutor-error" role="alert">
          {error}
        </div>
      )}

      <div className={`integrated-floating-palette ${paletteCollapsed ? "collapsed" : ""}`} role="toolbar" aria-label="Note controls">
        {paletteCollapsed ? <button className="palette-expand-btn" onClick={() => setPaletteCollapsed(false)} aria-label="Expand note controls" title="Expand note controls"><PencilLine size={18} /><CaretDown size={14} /></button> : <>
        <div className="palette-row">
          <div className="palette-group" aria-label="Document view">
            <button className={viewMode === "write" ? "active" : ""} onClick={() => setViewMode("write")} aria-pressed={viewMode === "write"}>Edit</button>
            <button className={viewMode === "preview" ? "active" : ""} onClick={() => setViewMode("preview")} aria-pressed={viewMode === "preview"}>Preview</button>
          </div>
          <button className={`ink-mode-toggle ${editorMode === "ink" ? "active" : ""}`} onClick={() => setEditorMode(mode => mode === "ink" ? "text" : "ink")} aria-pressed={editorMode === "ink"} title="Toggle ink layer">
            <PencilLine size={18} /><span>Ink</span>
          </button>
          <details className="note-toolbar-menu">
            <summary aria-label="More note options" title="More note options"><DotsThree size={20} /></summary>
            <div>
              <button onClick={() => setShowAnnotations(v => !v)}>{showAnnotations ? <Eye size={18} /> : <EyeSlash size={18} />}<span>{showAnnotations ? "Hide ink" : "Show ink"}</span></button>
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
                      <div className="pen-options-popover" role="dialog" aria-label="Pen Options">
                        <header>
                          <span>Pen Settings</span>
                          <button type="button" className="close-btn icon-button" onClick={() => setPenOptionsOpen(false)}>×</button>
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
                </div>
              </div>
            )}
        </>}
      </div>

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
            onChange={saveInkStrokes}
          />

          {/* Background Layer 1: Rendered Markdown Document */}
          <div className="integrated-doc-content" style={{position: "relative", zIndex: 1}}>
            {markdownBlocks.map((block) => (
              <article className="note-block" key={block.id}>
                <MarkdownBlock
                  block={block}
                  preview={viewMode === "preview"}
                  onSave={markdown}
                  onInsertInk={insertInk}
                  onNavigateNote={onNavigateNote}
                />
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
