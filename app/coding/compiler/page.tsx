"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowCounterClockwise, ArrowClockwise,
  CaretDown, CaretRight, CheckCircle, Eye, EyeSlash, FileCode, FloppyDisk, Folder, FolderOpen, FolderSimple,
  MagnifyingGlass, Play, Plus, Sparkle, Terminal, TextIndent, TextOutdent, WarningCircle, X
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("noema-compiler-language") as Language | null;
    if (savedLang && starters[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);

  const KEYWORDS = new Set([
    "async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for", "function", "if", "import", "in", "instanceof", "interface", "let", "new", "null", "of", "package", "private", "protected", "public", "return", "static", "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
    "and", "as", "assert", "def", "del", "elif", "except", "from", "global", "is", "lambda", "nonlocal", "not", "or", "pass", "raise",
    "auto", "bool", "char", "double", "float", "fn", "func", "int", "long", "mut", "pub", "ref", "short", "signed", "struct", "type", "unsigned", "use", "using"
  ]);

  const BUILTINS = new Set([
    "console", "log", "print", "printf", "Println", "println", "std", "cout", "System", "out", "main", "String", "args", "fmt", "package", "stdio"
  ]);

  function renderTokens(sourceCode: string) {
    if (!sourceCode) return null;
    const parts = sourceCode.split(/(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^\`]*`|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b)/g);
    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith("//") || part.startsWith("#")) {
        return <span key={index} className="syntax-comment">{part}</span>;
      }
      if (part.startsWith('"') || part.startsWith("'") || part.startsWith("`")) {
        return <span key={index} className="syntax-string">{part}</span>;
      }
      if (/^\d+(?:\.\d+)?$/.test(part)) {
        return <span key={index} className="syntax-number">{part}</span>;
      }
      if (KEYWORDS.has(part)) {
        return <span key={index} className="syntax-keyword">{part}</span>;
      }
      if (BUILTINS.has(part)) {
        return <span key={index} className="syntax-builtin">{part}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  }

  function syncScroll() {
    const ta = textareaRef.current;
    const hl = hlRef.current;
    if (!ta || !hl) return;
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
  }

  useEffect(() => {
    if (mode === "scratch") {
      const saved = localStorage.getItem(`noema-scratch-${language}`) || starters[language];
      setCode(saved);
      setOriginalContent(saved);
      setHistory([]);
      setRedoStack([]);
    }
  }, [language, mode]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = textareaRef.current;
    if (!el) return;

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void run();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) handleRedo();
      else handleUndo();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      handleRedo();
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;

    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const currentLine = val.slice(lineStart, start);
      const indentStr = (currentLine.match(/^[\t ]*/) || [""])[0];

      const autoPairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };

      if (start === end && start > 0 && autoPairs[val[start - 1]] && autoPairs[val[start - 1]] === val[start]) {
        const mid = "\n" + indentStr + "    ";
        const next = val.slice(0, start) + mid + "\n" + indentStr + val.slice(end);
        updateCode(next);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + mid.length, start + mid.length);
          updateCaretPos();
        });
      } else {
        const opens = /[[({:]$/.test(currentLine.replace(/\s+$/, ""));
        const nextIndent = indentStr + (opens ? "    " : "");
        const next = val.slice(0, start) + "\n" + nextIndent + val.slice(end);
        updateCode(next);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + 1 + nextIndent.length, start + 1 + nextIndent.length);
          updateCaretPos();
        });
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      indent(event.shiftKey);
      return;
    }

    const closers = new Set([")", "}", "]", '"', "'", "`"]);
    if (start === end && closers.has(event.key) && val[start] === event.key) {
      event.preventDefault();
      el.setSelectionRange(start + 1, start + 1);
      updateCaretPos();
      return;
    }

    const autoPairs: Record<string, string> = { "(": ")", "{": "}", "[": "]", '"': '"', "'": "'", "`": "`" };
    if (autoPairs[event.key]) {
      event.preventDefault();
      const open = event.key;
      const close = autoPairs[open];
      const selected = val.slice(start, end);
      const next = val.slice(0, start) + open + selected + close + val.slice(end);
      updateCode(next);
      requestAnimationFrame(() => {
        el.focus();
        if (selected) {
          el.setSelectionRange(start + open.length, start + open.length + selected.length);
        } else {
          el.setSelectionRange(start + open.length, start + open.length);
        }
        updateCaretPos();
      });
      return;
    }

    if (event.key === "Backspace" && start === end && start > 0) {
      const autoPairs: Record<string, string> = { "(": ")", "{": "}", "[": "]", '"': '"', "'": "'", "`": "`" };
      if (val[start - 1] && autoPairs[val[start - 1]] === val[start]) {
        event.preventDefault();
        const next = val.slice(0, start - 1) + val.slice(start + 1);
        updateCode(next);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start - 1, start - 1);
          updateCaretPos();
        });
        return;
      }
    }
  }

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
    localStorage.setItem("noema-compiler-language", value);
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

  async function run(event?: React.SyntheticEvent) {
    if (event) event.preventDefault();
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
      if (!response.ok) {
        setError(body.error?.message || `Run failed (${response.status})`);
        return;
      }
      setResult(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Compilation failed");
    } finally {
      setRunning(false);
    }
  }

  const isDirty = mode === "saved" && filePath && code !== originalContent;
  const fileTree = buildFileTree(files);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [stdinOpen, setStdinOpen] = useState(false);

  function syncScroll() {
    const ta = textareaRef.current;
    const hl = hlRef.current;
    const gt = gutterRef.current;
    if (!ta) return;
    if (hl) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
    if (gt) {
      gt.scrollTop = ta.scrollTop;
    }
  }

  return (
    <ModuleShell active="Coding" title="Compiler">
      <div className="compiler-container">
        {/* Top Header Bar matching lifeOS .code-top */}
        <div className="code-top">
          <div className="seg code-mode">
            <button
              type="button"
              className={mode === "scratch" ? "active" : ""}
              onClick={() => selectMode("scratch")}
            >
              Scratch
            </button>
            <button
              type="button"
              className={mode === "saved" ? "active" : ""}
              onClick={() => selectMode("saved")}
            >
              Saved
            </button>
          </div>

          <div className="code-top-actions">
            {mode === "saved" && (
              <button
                type="button"
                className={`icon-btn ${drawerOpen ? "active" : ""}`}
                onClick={() => setDrawerOpen(!drawerOpen)}
                title="Project files"
                aria-label="Toggle saved files drawer"
              >
                <FolderOpen size={16} />
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTutorOpen(true)}
              title="Tutor"
              aria-label="Tutor"
            >
              <Sparkle size={16} />
            </button>
            <button
              type="button"
              className={`icon-btn ${stdinOpen ? "active" : ""}`}
              onClick={() => setStdinOpen(!stdinOpen)}
              title="Toggle input (stdin)"
              aria-label="Toggle input (stdin)"
            >
              <Terminal size={16} />
            </button>
            <button
              type="button"
              className="btn primary code-run"
              disabled={running || !code.trim()}
              suppressHydrationWarning
              onClick={(e) => void run(e)}
              title="Run code (⌘ Enter)"
            >
              <Play size={14} weight="fill" />
              <span>{running ? "Running…" : "Run"}</span>
            </button>
          </div>
        </div>

        {/* Subbar matching lifeOS .code-subbar */}
        <div className="code-subbar">
          {mode === "scratch" ? (
            <select
              className="code-lang-select"
              value={language}
              onChange={(event) => changeLanguage(event.target.value as Language)}
              aria-label="Select language"
            >
              {Object.keys(starters).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : (
            <div className="code-file-actions">
              <input
                className="code-filename-input"
                aria-label="Saved filename"
                value={filePath}
                onChange={(event) => setFilePath(event.target.value)}
                placeholder="folder/main.py"
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setFilePath("");
                  setCode(starters[language]);
                  setOriginalContent(starters[language]);
                }}
                title="New file"
                aria-label="New file"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={!filePath.trim()}
                suppressHydrationWarning
                onClick={() => void saveFile()}
                title="Save file"
                aria-label="Save file"
              >
                <FloppyDisk size={16} />
              </button>
            </div>
          )}

          <small className="caret-pos-indicator">
            Ln {caretPos.line}, Col {caretPos.col}
          </small>

          <div className="spacer" />

          <button
            type="button"
            className="icon-btn"
            aria-label="Undo edit"
            title="Undo"
            disabled={!history.length}
            suppressHydrationWarning
            onClick={handleUndo}
          >
            <ArrowCounterClockwise size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Redo edit"
            title="Redo"
            disabled={!redoStack.length}
            suppressHydrationWarning
            onClick={handleRedo}
          >
            <ArrowClockwise size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${highlight ? "active" : ""}`}
            onClick={() => setHighlight((value) => !value)}
            title="Show highlighting"
            aria-label="Show highlighting"
          >
            {highlight ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Outdent selection"
            title="Outdent selection"
            onClick={() => indent(true)}
          >
            <TextOutdent size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Indent selection"
            title="Indent selection"
            onClick={() => indent()}
          >
            <TextIndent size={16} />
          </button>
        </div>

        {/* Collapsible Stdin Panel matching lifeOS .code-stdin-wrap */}
        {stdinOpen && (
          <div className="code-stdin-wrap">
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              placeholder="Program input (stdin)..."
              rows={2}
              aria-label="Standard input"
            />
          </div>
        )}

        {/* Collapsible Output Panel matching lifeOS .code-panel */}
        {(result || error) && (
          <div className="code-panel">
            <div className="code-panel-head">
              <span className={`code-status ${error ? "err" : "ok"}`}>
                {error ? "Compilation error" : `Output · ${result?.durationMs}ms · exit ${result?.code}`}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setResult(null);
                  setError("");
                }}
                title="Close output"
                aria-label="Close output"
              >
                <X size={14} />
              </button>
            </div>
            <pre className={`code-out-body ${error ? "oe" : ""}`}>
              {error || result?.output || "(No output)"}
            </pre>
          </div>
        )}

        {/* Saved Files Drawer overlay if open */}
        {mode === "saved" && drawerOpen && (
          <aside className="compiler-files drawer-open" aria-label="Saved files">
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
              <button type="button" className="icon-btn" onClick={() => setDrawerOpen(false)} title="Close files">
                <X size={14} />
              </button>
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

        {/* Code Editor Stack with Line Numbers Gutter matching lifeOS .code-editor */}
        <div className="code-editor" onClick={() => textareaRef.current?.focus()}>
          <div className="code-gutter" ref={gutterRef} onClick={() => textareaRef.current?.focus()}>
            <div className="code-gutter-inner">
              {code.split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          </div>
          <div className="code-stack">
            {highlight && (
              <pre className="code-hl" ref={hlRef} aria-hidden="true">
                <code className={`language-${language}`}>
                  {renderTokens(code)}
                </code>
              </pre>
            )}
            <textarea
              ref={textareaRef}
              className={`code-body ${highlight ? "highlighted" : "plain"}`}
              value={code}
              onChange={(event) => updateCode(event.target.value)}
              onScroll={syncScroll}
              onClick={updateCaretPos}
              onKeyUp={updateCaretPos}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              aria-label="Source code"
            />
          </div>
        </div>

        {/* Symbol Bar & Joystick matching lifeOS .code-symbols-wrap */}
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
      </div>

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
