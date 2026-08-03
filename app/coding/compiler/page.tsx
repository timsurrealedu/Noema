"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowCounterClockwise, ArrowClockwise,
  CaretDown, CaretRight, CheckCircle, FileCode, FloppyDisk, Folder, FolderOpen, FolderSimple,
  MagnifyingGlass, Play, Plus, Sparkle, Terminal, TextIndent, TextOutdent, WarningCircle
} from "@phosphor-icons/react";
import { ModuleShell } from "../../components/ModuleShell";
import { TutorPanel } from "../../components/TutorPanel";

const LazySyntaxPreview = dynamic(() => import("../../components/LazySyntaxPreview"), { ssr: false });

const starters = {
  javascript: "console.log(6 * 7);",
  python: "print(6 * 7)",
  c: '#include <stdio.h>\nint main(void) { printf("%d\\n", 6 * 7); }',
  cpp: '#include <iostream>\nint main() { std::cout << 6 * 7 << "\\n"; }',
  go: 'package main\nimport "fmt"\nfunc main() { fmt.Println(6 * 7) }',
  rust: 'fn main() { println!("{}", 6 * 7); }',
  java: 'public class Main { public static void main(String[] args) { System.out.println(6 * 7); } }',
  bash: 'printf "Hello from Bash\\n"'
};
type Language = keyof typeof starters;
type Result = { code: number; output: string; truncated: boolean; stage: string; durationMs: number };
type SavedFile = { path: string; name: string; language: Language | null };

const CODE_KEYS = [
  { t: "(", v: "(", close: ")" },
  { t: "{", v: "{", close: "}" },
  { t: "[", v: "[", close: "]" },
  { t: '"', v: '"', close: '"' },
  { t: ";", v: ";" },
  { t: ":", v: ":" },
  { t: "=", v: "=" },
  { t: ".", v: "." },
  { t: ",", v: "," },
  { t: "'", v: "'", close: "'" },
  { t: "`", v: "`", close: "`" },
  { t: "<", v: "<" },
  { t: ">", v: ">" },
  { t: "+", v: "+" },
  { t: "-", v: "-" },
  { t: "*", v: "*" },
  { t: "/", v: "/" },
  { t: "%", v: "%" },
  { t: "&", v: "&" },
  { t: "|", v: "|" },
  { t: "!", v: "!" },
  { t: "#", v: "#" },
  { t: "_", v: "_" },
  { t: "\\", v: "\\" },
  { t: "$", v: "$" },
  { t: "@", v: "@" },
  { t: "Tab", v: "    ", wide: true }
] as const;

function SymbolButton({
  k,
  onInsert,
  onInsertPair
}: {
  k: (typeof CODE_KEYS)[number];
  onInsert: (text: string) => void;
  onInsertPair: (open: string, close: string) => void;
}) {
  const sx = useRef(0);
  const sy = useRef(0);
  const moved = useRef(false);
  const held = useRef(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <button
      type="button"
      className={`sym${"wide" in k && k.wide ? " sym-wide" : ""}${"close" in k && k.close ? " sym-pair" : ""}`}
      data-close={"close" in k ? (k as { close?: string }).close : undefined}
      onPointerDown={(ev) => {
        ev.preventDefault();
        sx.current = ev.clientX;
        sy.current = ev.clientY;
        moved.current = false;
        held.current = false;
        if ("close" in k && (k as { close?: string }).close) {
          timer.current = setTimeout(() => {
            held.current = true;
            onInsert((k as { close: string }).close);
          }, 340);
        }
      }}
      onPointerMove={(ev) => {
        if (!moved.current && Math.hypot(ev.clientX - sx.current, ev.clientY - sy.current) > 8) {
          moved.current = true;
          clear();
        }
      }}
      onPointerUp={(ev) => {
        clear();
        if (moved.current || held.current) return;
        ev.preventDefault();
        if ("close" in k && (k as { close?: string }).close) {
          onInsertPair(k.v, (k as { close: string }).close);
        } else {
          onInsert(k.v);
        }
      }}
      onPointerCancel={clear}
    >
      {k.t}
    </button>
  );
}

function JoystickButton({ onMoveCaret }: { onMoveCaret: (dir: "up" | "down" | "left" | "right") => void }) {
  const padRef = useRef<HTMLButtonElement>(null);
  const repRef = useRef<NodeJS.Timeout | null>(null);
  const dirRef = useRef<"up" | "down" | "left" | "right" | null>(null);

  const dirAt = (clientX: number, clientY: number) => {
    if (!padRef.current) return null;
    const r = padRef.current.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 6) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
  };

  const stop = () => {
    if (repRef.current) {
      clearInterval(repRef.current);
      repRef.current = null;
    }
    dirRef.current = null;
  };

  return (
    <button
      ref={padRef}
      className="sym code-joy"
      type="button"
      aria-label="Move caret (press a direction, hold to repeat)"
      onPointerDown={(ev) => {
        ev.preventDefault();
        if (padRef.current && "setPointerCapture" in padRef.current) {
          try { padRef.current.setPointerCapture(ev.pointerId); } catch {}
        }
        const dir = dirAt(ev.clientX, ev.clientY);
        dirRef.current = dir;
        if (dir) onMoveCaret(dir);
        if (repRef.current) clearInterval(repRef.current);
        repRef.current = setInterval(() => {
          if (dirRef.current) onMoveCaret(dirRef.current);
        }, 110);
      }}
      onPointerMove={(ev) => {
        if (repRef.current) {
          dirRef.current = dirAt(ev.clientX, ev.clientY) || dirRef.current;
        }
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <span className="joy-u">▲</span>
      <span className="joy-l">◀</span>
      <span className="joy-r">▶</span>
      <span className="joy-d">▼</span>
    </button>
  );
}

type FileNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileNode[];
  language?: Language | null;
};

function buildFileTree(files: SavedFile[]): FileNode[] {
  const root: FileNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");
      let existing = current.find((item) => item.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: isLast ? undefined : [],
          language: isLast ? file.language : undefined
        };
        current.push(existing);
      }
      if (!isLast && existing.children) {
        current = existing.children;
      }
    }
  }
  return root;
}

function FileTreeNode({
  node,
  activePath,
  onSelectFile,
  filter
}: {
  node: FileNode;
  activePath: string;
  onSelectFile: (path: string) => void;
  filter: string;
}) {
  const [open, setOpen] = useState(true);

  if (filter && !node.path.toLowerCase().includes(filter.toLowerCase())) {
    if (!node.isFolder || !node.children?.some((c) => c.path.toLowerCase().includes(filter.toLowerCase()))) {
      return null;
    }
  }

  if (node.isFolder) {
    return (
      <div className="compiler-tree-folder">
        <button
          type="button"
          className="compiler-tree-folder-btn"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CaretDown size={14} /> : <CaretRight size={14} />}
          {open ? <FolderOpen size={16} /> : <FolderSimple size={16} />}
          <span>{node.name}</span>
        </button>
        {open && node.children && (
          <div className="compiler-tree-children">
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                activePath={activePath}
                onSelectFile={onSelectFile}
                filter={filter}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`compiler-tree-file-btn ${node.path === activePath ? "active" : ""}`}
      onClick={() => onSelectFile(node.path)}
    >
      <FileCode size={15} />
      <span>{node.name}</span>
      <small className="compiler-file-rel">{node.path}</small>
    </button>
  );
}

export default function CompilerPage() {
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState(starters.javascript);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [highlight,setHighlight]=useState(true);

  const [mode, setMode] = useState<"scratch" | "saved">("scratch");
  const [files, setFiles] = useState<SavedFile[]>([]);
  const [filePath, setFilePath] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [fileFilter, setFileFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [caretPos, setCaretPos] = useState({ line: 1, col: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === "scratch") {
      const saved = localStorage.getItem(`noema-scratch-${language}`) || starters[language];
      setCode(saved);
      setOriginalContent(saved);
      setHistory([]);
      setRedoStack([]);
    }
  }, [language, mode]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        const form = el.form;
        if (form) form.requestSubmit();
        return;
      }
      if (event.key!=="Enter"||event.shiftKey||event.isComposing) return;
      const before = el.value.slice(0, el.selectionStart);
      const indentStr = before.slice(before.lastIndexOf("\n") + 1).match(/^\s*/)?.[0] || "";
      if (!indentStr) return;
      event.preventDefault();
      el.setRangeText(`\n${indentStr}`, el.selectionStart, el.selectionEnd, "end");
      updateCode(el.value);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [language, mode, code]);

  function updateCode(newCode: string) {
    setHistory((h) => [...h.slice(-30), code]);
    setRedoStack([]);
    setCode(newCode);
    if (mode === "scratch") localStorage.setItem(`noema-scratch-${language}`, newCode);
  }

  function handleUndo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, code]);
    setHistory((h) => h.slice(0, -1));
    setCode(prev);
    if (mode === "scratch") localStorage.setItem(`noema-scratch-${language}`, prev);
  }

  function handleRedo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, code]);
    setRedoStack((r) => r.slice(0, -1));
    setCode(next);
    if (mode === "scratch") localStorage.setItem(`noema-scratch-${language}`, next);
  }

  function updateCaretPos() {
    const el = textareaRef.current;
    if (!el) return;
    const val = el.value.slice(0, el.selectionStart);
    const lines = val.split("\n");
    setCaretPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  }

  function insert(text: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const autoPairs: Record<string, string> = { "(": ")", "{": "}", "[": "]", '"': '"', "'": "'" };

    if (autoPairs[text]) {
      const closing = autoPairs[text];
      const selected = el.value.slice(start, end);
      el.setRangeText(`${text}${selected}${closing}`, start, end, "end");
      if (!selected) el.setSelectionRange(start + 1, start + 1);
    } else {
      el.setRangeText(text, start, end, "end");
    }
    updateCode(el.value);
    el.focus();
    updateCaretPos();
  }

  function indent(out = false) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
    const selection = el.value.slice(lineStart, end);
    const next = out ? selection.replace(/^ {1,2}/gm, "") : selection.replace(/^/gm, "  ");
    el.setRangeText(next, lineStart, end, "select");
    updateCode(el.value);
    el.focus();
    updateCaretPos();
  }

  function moveCaret(direction: "up" | "down" | "left" | "right") {
    const el = textareaRef.current;
    if (!el) return;
    let position = el.selectionStart;
    if (direction === "left") position = Math.max(0, position - 1);
    else if (direction === "right") position = Math.min(el.value.length, position + 1);
    else {
      const lines = el.value.split("\n");
      const before = el.value.slice(0, position).split("\n");
      const row = before.length - 1;
      const column = before.at(-1)!.length;
      const target = Math.max(0, Math.min(lines.length - 1, row + (direction === "up" ? -1 : 1)));
      position =
        lines.slice(0, target).reduce((total, line) => total + line.length + 1, 0) +
        Math.min(column, lines[target].length);
    }
    el.setSelectionRange(position, position);
    el.focus();
    updateCaretPos();
  }

  const mobileKeys = ["()", "{}", "[]", ";", '"', "'", "=", "=>", "  "];

  function changeLanguage(value: Language) {
    if (mode === "scratch") localStorage.setItem(`noema-scratch-${language}`, code);
    setLanguage(value);
    setResult(null);
    setError("");
  }

  async function loadFiles() {
    const response = await fetch("/api/v1/compiler/files");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || "Saved files could not load");
    setFiles(body.files || []);
  }

  async function openFile(path: string) {
    setError("");
    try {
      const response = await fetch(`/api/v1/compiler/files/content?path=${encodeURIComponent(path)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "File could not open");
      setFilePath(body.path);
      setCode(body.content);
      setOriginalContent(body.content);
      if (body.language) setLanguage(body.language);
      setHistory([]);
      setRedoStack([]);
      setDrawerOpen(false);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function saveFile() {
    if (!filePath.trim()) return;
    setError("");
    try {
      const response = await fetch("/api/v1/compiler/files/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: code })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "File could not save");
      setFilePath(body.path);
      setOriginalContent(code);
      await loadFiles();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  function selectMode(next: "scratch" | "saved") {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    setError("");
    if (next === "saved") void loadFiles().catch((reason) => setError(reason.message));
    else {
      const saved = localStorage.getItem(`noema-scratch-${language}`) || starters[language];
      setCode(saved);
      setOriginalContent(saved);
      setHistory([]);
      setRedoStack([]);
    }
  }

  async function run(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/v1/compiler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Compilation failed");
      setResult(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Compilation failed");
    } finally {
      setRunning(false);
    }
  }

  const isDirty = mode === "saved" && filePath && code !== originalContent;
  const fileTree = buildFileTree(files);

  return (
    <ModuleShell
      active="Coding"
      title="Compiler"
      action={
        <Link className="secondary" href="/coding">
          <ArrowLeft />
          Coding
        </Link>
      }
    >
      <div className="compiler-modebar">
        <button className={mode === "scratch" ? "active" : ""} onClick={() => selectMode("scratch")}>
          Scratch
        </button>
        <button className={mode === "saved" ? "active" : ""} onClick={() => selectMode("saved")}>
          <Folder />
          Saved
        </button>
        {mode === "saved" && (
          <>
            <button
              type="button"
              className="compiler-drawer-toggle"
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <FolderOpen /> Files ({files.length})
            </button>
            <input
              aria-label="Saved filename"
              value={filePath}
              onChange={(event) => setFilePath(event.target.value)}
              placeholder="folder/main.py"
            />
            <button
              type="button"
              onClick={() => {
                setFilePath("");
                setCode(starters[language]);
                setOriginalContent(starters[language]);
              }}
            >
              <Plus />
              New file
            </button>
            <button
              type="button"
              className="primary"
              disabled={!filePath.trim()}
              onClick={() => void saveFile()}
            >
              <FloppyDisk />
              Save file {isDirty ? "*" : ""}
            </button>
          </>
        )}
      </div>

      <form className="compiler-workspace" onSubmit={run}>
        {mode === "saved" && (
          <aside className={`compiler-files ${drawerOpen ? "drawer-open" : ""}`} aria-label="Saved files">
            <div className="compiler-files-header">
              <span>Saved files</span>
              <div className="compiler-files-search">
                <MagnifyingGlass size={14} />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  aria-label="Filter saved files"
                />
              </div>
            </div>
            <div className="compiler-tree-container">
              {fileTree.length === 0 ? (
                <p className="compiler-empty-files">No saved files found.</p>
              ) : (
                fileTree.map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    activePath={filePath}
                    onSelectFile={(path) => void openFile(path)}
                    filter={fileFilter}
                  />
                ))
              )}
            </div>
          </aside>
        )}

        <header>
          <div>
            <h2>Run code safely</h2>
            <p>Each run uses a disposable, network-isolated workspace with time and output limits.</p>
          </div>
          <button className="secondary" type="button" onClick={() => setTutorOpen(true)}>
            <Sparkle />
            Ask tutor
          </button>
          <label>
            Language
            <select value={language} onChange={(event) => changeLanguage(event.target.value as Language)}>
              {Object.keys(starters).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={running || !code.trim()} title="Run code (⌘ Enter)">
            {running ? (
              "Running…"
            ) : (
              <>
                <Play />
                Run
              </>
            )}
          </button>
        </header>

        <label className="code-editor">
          <div className="code-editor-head">
            <span>
              {mode === "scratch" ? `Scratch (${language})` : filePath || "New saved file"}
              {isDirty ? " *" : ""}
            </span>
            <span>
              <small className="caret-pos-indicator">
                Ln {caretPos.line}, Col {caretPos.col}
              </small>
              <button
                type="button"
                aria-label="Undo edit"
                disabled={!history.length}
                onClick={handleUndo}
              >
                <ArrowCounterClockwise size={14} />
              </button>
              <button
                type="button"
                aria-label="Redo edit"
                disabled={!redoStack.length}
                onClick={handleRedo}
              >
                <ArrowClockwise size={14} />
              </button>
              <button type="button" onClick={() => setHighlight((value) => !value)}>
                {highlight ? "Hide highlighting" : "Show highlighting"}
              </button>
              <button type="button" aria-label="Outdent selection" onClick={() => indent(true)}>
                <TextOutdent />
              </button>
              <button type="button" aria-label="Indent selection" onClick={() => indent()}>
                <TextIndent />
              </button>
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={code}
            onChange={(event) => {
              updateCode(event.target.value);
            }}
            onClick={updateCaretPos}
            onKeyUp={updateCaretPos}
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                indent(event.shiftKey);
              }
            }}
            spellCheck={false}
            aria-label="Source code"
          />
          {highlight && <LazySyntaxPreview code={code} language={language} />}

          <div className="code-symbols-wrap">
            <div className="code-symbols">
              {CODE_KEYS.map((k) => (
                <SymbolButton
                  key={k.t}
                  k={k}
                  onInsert={(text) => insert(text)}
                  onInsertPair={(open, close) => {
                    const el = textareaRef.current;
                    if (!el) return;
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    const selected = el.value.slice(start, end);
                    el.setRangeText(`${open}${selected}${close}`, start, end, "end");
                    if (!selected) el.setSelectionRange(start + open.length, start + open.length);
                    updateCode(el.value);
                    el.focus();
                    updateCaretPos();
                  }}
                />
              ))}
            </div>
            <div className="code-arrows">
              <JoystickButton onMoveCaret={moveCaret} />
            </div>
          </div>
        </label>

        <label className="compiler-stdin-label">
          Standard input
          <textarea
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            aria-label="Standard input"
            placeholder="Pass inputs to stdin here..."
          />
        </label>

        <section className="compiler-output" aria-live="polite">
          <header>
            <Terminal />
            <strong>Output</strong>
            {result && (
              <small>
                {result.stage} · {result.durationMs} ms · exit {result.code}
              </small>
            )}
          </header>
          {error ? (
            <div className="compiler-error" role="alert">
              <WarningCircle />
              <span>{error}</span>
            </div>
          ) : result ? (
            <>
              <div className={result.code === 0 ? "compiler-success" : "compiler-error"}>
                {result.code === 0 ? <CheckCircle /> : <WarningCircle />}
                <span>
                  {result.code === 0 ? "Run completed" : "Run failed"}
                  {result.truncated ? " · output truncated" : ""}
                </span>
              </div>
              <pre>
                <code>{result.output || "(no output)"}</code>
              </pre>
            </>
          ) : (
            <p>Run output appears here.</p>
          )}
        </section>
      </form>

      {tutorOpen && (
        <TutorPanel
          kind="code"
          context={{
            name: mode === "saved" && filePath ? filePath : `main.${language}`,
            language,
            code
          }}
          onApply={(value) => value && updateCode(value)}
          onClose={() => setTutorOpen(false)}
        />
      )}
    </ModuleShell>
  );
}
