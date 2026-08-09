"use client";

import {createId} from "../lib/id";
import {useEffect,useRef,useState} from "react";
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
import {MarkdownToolbar} from "./MarkdownToolbar";
import {MarkdownContent} from "./MarkdownContent";
import {markdownKey} from "../lib/markdownEdit";
import {WikilinkCompletion} from "./WikilinkCompletion";

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
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(block.markdown);

  return (
    <div className="markdown-block-editor">
      {!preview ? (
        <>
          <MarkdownToolbar textarea={textarea} onChange={setValue} />
          <textarea
            ref={textarea}
            aria-label="Markdown block"
            value={value}
            onChange={event => setValue(event.target.value)}
            onKeyDown={event => markdownKey(event, setValue)}
            onBlur={() => value !== block.markdown && onSave(block, value)}
            spellCheck
          />
          <WikilinkCompletion textarea={textarea} value={value} onChange={setValue} />
        </>
      ) : (
        <article className="markdown-preview block-preview">
          <MarkdownContent text={value} onNavigateNote={onNavigateNote} />
        </article>
      )}
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

  useEffect(() => {
    setCurrentStrokes(strokes);
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
      const erased = eraseAt(currentStrokes, pt, size * 4);
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
    setCurrentStrokes(prev => [...prev, stroke]);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current || !interactive) return;
    const pt = getPoint(event);
    if (!pt) return;

    if (activeTool === "eraser") {
      const erased = eraseAt(currentStrokes, pt, size * 4);
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
      setCurrentStrokes(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current) return;
    drawing.current = false;

    if (activeStroke.current) {
      const finalStroke = activeStroke.current;
      activeStroke.current = null;
      const next = currentStrokes.map(s => (s.id === finalStroke.id ? finalStroke : s));
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
        return (
          <path
            key={stroke.id}
            d={strokePath(stroke)}
            fill="none"
            stroke={stroke.color}
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
  const [viewMode, setViewMode] = useState<"write" | "preview">("write");
  const [editorMode, setEditorMode] = useState<"text" | "ink">(initialInk ? "ink" : "text");
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [activeTool, setActiveTool] = useState<InkTool>("pen");
  const [color, setColor] = useState(() => {
    if (typeof window !== "undefined") {
      const isLight = document.documentElement.classList.contains("light") ||
                      document.body.classList.contains("light-theme") ||
                      window.matchMedia?.("(prefers-color-scheme: light)").matches;
      return isLight ? "#0f172a" : "#f8fafc";
    }
    return "#f8fafc";
  });
  const [size, setSize] = useState(3);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);

  const inkBlock = blocks.find(b => b.kind === "ink");
  const overlayStrokes = sanitizeStrokes(inkBlock?.strokes || []);

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
        if (entry.contentRect) {
          setViewportWidth(Math.floor(entry.contentRect.width));
          setViewportHeight(Math.max(500, Math.floor(entry.contentRect.height)));
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

    pendingStrokesRef.current = nextStrokes;
    if (savingInkRef.current) return;
    savingInkRef.current = true;

    while (pendingStrokesRef.current !== null) {
      const strokesToSave = pendingStrokesRef.current;
      pendingStrokesRef.current = null;

      const targetInkId = inkBlock?.id || createId();

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
          if (data.version !== undefined || data.inkVersion !== undefined) {
            currentInkVersion.current = data.version ?? data.inkVersion;
          } else {
            currentInkVersion.current += 1;
          }
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
    await load();
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

  if (loading) return <div className="mixed-editor-loading">Loading document…</div>;

  const markdownBlocks = blocks.filter(b => b.kind === "markdown");

  return (
    <div className="integrated-note-editor mixed-note-editor">
      {error && (
        <div className="tutor-error" role="alert">
          {error}
        </div>
      )}

      {/* Sleek Floating Palette Dock */}
      <div className={`integrated-floating-palette ${paletteCollapsed ? "collapsed" : ""}`} role="toolbar" aria-label="Floating Note Palette">
        {paletteCollapsed ? (
          <div className="palette-group">
            <button
              onClick={() => setPaletteCollapsed(false)}
              title="Expand Toolbar Palette"
              aria-label="Expand Toolbar Palette"
              className="palette-expand-btn"
            >
              <PencilLine size={16} />
              <CaretDown size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="palette-group">
              <button
                className={viewMode === "write" ? "active" : ""}
                onClick={() => setViewMode("write")}
                title="Write Mode (Edit Markdown)"
                aria-label="Write Mode"
              >
                Write
              </button>
              <button
                className={viewMode === "preview" ? "active" : ""}
                onClick={() => setViewMode("preview")}
                title="Preview Mode (Rendered Markdown)"
                aria-label="Preview Mode"
              >
                Preview
              </button>
            </div>

            <div className="palette-divider" />

            <div className="palette-group">
              <button
                className={editorMode === "text" ? "active" : ""}
                onClick={() => setEditorMode("text")}
                title="Type Text Mode"
                aria-label="Type Text Mode"
              >
                <TextT size={18} />
              </button>
              <button
                className={editorMode === "ink" ? "active" : ""}
                onClick={() => setEditorMode("ink")}
                title="Annotate & Ink Mode"
                aria-label="Annotate & Ink Mode"
              >
                <PencilLine size={18} />
              </button>
            </div>

            <div className="palette-divider" />

            {editorMode === "ink" && (
              <>
                <div className="palette-group">
                  <button
                    className={activeTool === "pen" ? "active" : ""}
                    onClick={() => setActiveTool("pen")}
                    title="Pen"
                    aria-label="Pen tool"
                  >
                    <PenNib size={18} />
                  </button>
                  <button
                    className={activeTool === "highlighter" ? "active" : ""}
                    onClick={() => setActiveTool("highlighter")}
                    title="Highlighter"
                    aria-label="Highlighter tool"
                  >
                    <HighlighterCircle size={18} />
                  </button>
                  <button
                    className={activeTool === "eraser" ? "active" : ""}
                    onClick={() => setActiveTool("eraser")}
                    title="Eraser"
                    aria-label="Eraser tool"
                  >
                    <Broom size={18} />
                  </button>
                </div>

                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  title="Ink Color"
                  aria-label="Ink Color"
                  className="palette-color-input"
                />

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

                <div className="palette-divider" />
              </>
            )}

            <div className="palette-group">
              <button
                className={showAnnotations ? "active" : ""}
                onClick={() => setShowAnnotations(v => !v)}
                title={showAnnotations ? "Hide Ink Annotations" : "Show Ink Annotations"}
                aria-label={showAnnotations ? "Hide Ink Annotations" : "Show Ink Annotations"}
              >
                {showAnnotations ? <Eye size={18} /> : <EyeSlash size={18} />}
              </button>

              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  title={fullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
                  aria-label={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {fullscreen ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}
                </button>
              )}

              <button
                onClick={() => setPaletteCollapsed(true)}
                title="Collapse Toolbar Palette"
                aria-label="Collapse Toolbar Palette"
              >
                <CaretUp size={18} />
              </button>
            </div>
          </>
        )}
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


