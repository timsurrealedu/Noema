"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowCounterClockwise, ArrowClockwise,
  CaretDown, CaretRight, CheckCircle, DotsThree, Eye, EyeSlash, FileCode, FloppyDisk, Folder, FolderOpen, FolderSimple,
  MagnifyingGlass, Play, Plus, Sparkle, Terminal, TextIndent, TextOutdent, WarningCircle, X
} from "@phosphor-icons/react";
import { ModuleShell } from "../../components/ModuleShell";
import { TutorPanel } from "../../components/TutorPanel";

const LazySyntaxPreview = dynamic(() => import("../../components/LazySyntaxPreview"), { ssr: false });

const starters = {
  javascript: "console.log(6 * 7);",
  python: "print(6 * 7)",
  c: '#include <stdio.h>\nint main(){\n    printf("hi there");\n}',
  cpp: '#include <iostream>\nint main() { std::cout << "hi there\\n"; }',
  go: 'package main\nimport "fmt"\nfunc main() { fmt.Println("hi there") }',
  rust: 'fn main() { println!("hi there"); }',
  java: 'public class Main { public static void main(String[] args) { System.out.println("hi there"); } }',
  bash: 'printf "hi there\\n"'
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

type KeyDef = { t: string; v: string; close?: string; wide?: boolean };

const LANG_KEYS: Record<Language, readonly KeyDef[]> = {
  c: [
    { t: "{ }", v: "{", close: "}" },
    { t: "( )", v: "(", close: ")" },
    { t: "[ ]", v: "[", close: "]" },
    { t: ";", v: ";" },
    { t: '"', v: '"', close: '"' },
    { t: "&", v: "&" },
    { t: "*", v: "*" },
    { t: "->", v: "->" },
    { t: "=", v: "=" },
    { t: "+", v: "+" },
    { t: "-", v: "-" },
    { t: ",", v: "," }
  ],
  cpp: [
    { t: "{ }", v: "{", close: "}" },
    { t: "( )", v: "(", close: ")" },
    { t: "[ ]", v: "[", close: "]" },
    { t: ";", v: ";" },
    { t: '"', v: '"', close: '"' },
    { t: "<<", v: "<<" },
    { t: ">>", v: ">>" },
    { t: "::", v: "::" },
    { t: "->", v: "->" },
    { t: "&", v: "&" },
    { t: "*", v: "*" },
    { t: "=", v: "=" }
  ],
  python: [
    { t: ":", v: ":" },
    { t: "( )", v: "(", close: ")" },
    { t: "[ ]", v: "[", close: "]" },
    { t: "{ }", v: "{", close: "}" },
    { t: '"', v: '"', close: '"' },
    { t: "'", v: "'", close: "'" },
    { t: "#", v: "#" },
    { t: "=", v: "=" },
    { t: "def", v: "def " },
    { t: "in", v: " in " },
    { t: "->", v: "->" }
  ],
  javascript: [
    { t: "{ }", v: "{", close: "}" },
    { t: "( )", v: "(", close: ")" },
    { t: "[ ]", v: "[", close: "]" },
    { t: "=>", v: "=> " },
    { t: ";", v: ";" },
    { t: '"', v: '"', close: '"' },
    { t: "`", v: "`", close: "`" },
    { t: "const", v: "const " },
    { t: "let", v: "let " },
    { t: "===", v: "===" }
  ],
  go: [
    { t: "{ }", v: "{", close: "}" },
    { t: "( )", v: "(", close: ")" },
    { t: ":=", v: ":= " },
    { t: ";", v: ";" },
    { t: '"', v: '"', close: '"' },
    { t: "&", v: "&" },
    { t: "*", v: "*" },
    { t: "struct", v: "struct " },
    { t: "func", v: "func " },
    { t: "if", v: "if " }
  ],
  rust: [
    { t: "{ }", v: "{", close: "}" },
    { t: "( )", v: "(", close: ")" },
    { t: "->", v: "->" },
    { t: ";", v: ";" },
    { t: '"', v: '"', close: '"' },
    { t: "&", v: "&" },
    { t: "mut", v: "mut " },
    { t: "fn", v: "fn " },
    { t: "let", v: "let " },
    { t: "match", v: "match " }
  ],
  java: [
    { t: "{ }", v: "{", close: "}" },
    { t: "( )", v: "(", close: ")" },
    { t: "[ ]", v: "[", close: "]" },
    { t: ";", v: ";" },
    { t: '"', v: '"', close: '"' },
    { t: "=", v: "=" },
    { t: "public", v: "public " },
    { t: "class", v: "class " },
    { t: "new", v: "new " }
  ],
  bash: [
    { t: '"', v: '"', close: '"' },
    { t: "'", v: "'", close: "'" },
    { t: "$", v: "$" },
    { t: "|", v: "|" },
    { t: ">", v: ">" },
    { t: ";", v: ";" },
    { t: "&&", v: "&&" },
    { t: "#", v: "#" },
    { t: "echo", v: "echo " }
  ]
};

function SymbolButton({
  k,
  onInsert,
  onInsertPair
}: {
  k: KeyDef;
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
      className={`sym${"wide" in k && k.wide ? " sym-wide" : ""}${k.close ? " sym-pair" : ""}`}
      data-close={k.close}
      onPointerDown={(ev) => {
        ev.preventDefault();
        sx.current = ev.clientX;
        sy.current = ev.clientY;
        moved.current = false;
        held.current = false;
        if (k.close) {
          timer.current = setTimeout(() => {
            held.current = true;
            onInsert(k.close!);
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
        if (k.close) {
          onInsertPair(k.v, k.close);
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
  const [tutorPrompt, setTutorPrompt] = useState<string | undefined>(undefined);
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
  const abortRef = useRef<AbortController | null>(null);
  const [stopping, setStopping] = useState(false);
  const dirtyRef = useRef(false);

  // Mobile UX Enhancements State
  const [isEditing, setIsEditing] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"output" | "terminal" | "problems">("output");
  const [selectedText, setSelectedText] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth <= 820 || window.matchMedia("(max-width: 820px)").matches;
    if (!isMobile) return;

    window.history.pushState({ page: "compiler" }, "", window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      router.push("/");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("noema-compiler-language") as Language | null;
    if (savedLang && starters[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);
  const filesButtonRef = useRef<HTMLButtonElement>(null);
  const filesDrawerWasOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) filesDrawerWasOpen.current = true;
    else if (filesDrawerWasOpen.current) {
      filesDrawerWasOpen.current = false;
      filesButtonRef.current?.focus();
    }
  }, [drawerOpen]);

  useEffect(() => { dirtyRef.current = !!(mode === "saved" && filePath && code !== originalContent); });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

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

    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
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
    if (isDirty && !confirmDiscard()) return;
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
    if (mode === "saved" && isDirty && !confirmDiscard()) return;
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

  function confirmDiscard(): boolean {
    return window.confirm("You have unsaved changes. Discard them?");
  }

  async function run(event?: React.SyntheticEvent) {
    if (event) event.preventDefault();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setStopping(false);
    setError("");
    setResult(null);
    setPanelOpen(true);
    setActiveTab("output");
    try {
      const response = await fetch("/api/v1/compiler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
        signal: controller.signal
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message || `Run failed (${response.status})`);
        setActiveTab("problems");
        return;
      }
      setResult(body);
      if (body.code !== 0) {
        setActiveTab("problems");
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setError("Run cancelled");
        return;
      }
      setError(reason instanceof Error ? reason.message : "Compilation failed");
      setActiveTab("problems");
    } finally {
      setRunning(false);
      setStopping(false);
      abortRef.current = null;
    }
  }

  function stopRun() {
    abortRef.current?.abort();
    setStopping(true);
  }

  const isDirty = mode === "saved" && filePath && code !== originalContent;
  const fileTree = buildFileTree(files);
  const gutterRef = useRef<HTMLDivElement>(null);

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
    <ModuleShell active="Coding" title="">
      <div className="compiler-container">
        {/* Top Header Bar */}
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
            <button
              type="button"
              className="icon-btn code-ask-btn"
              onClick={() => {
                setTutorPrompt(undefined);
                setTutorOpen(true);
              }}
              title="Ask AI Tutor"
              aria-label="Ask AI Tutor"
            >
              <Sparkle size={14} />
              <span className="code-ask-text">Ask</span>
            </button>

            <button
              type="button"
              className="btn primary code-run"
              disabled={running ? false : (!code.trim())}
              suppressHydrationWarning
              onClick={(e) => running ? stopRun() : void run(e)}
              title={running ? "Stop execution" : "Run code (⌘ Enter)"}
            >
              {running ? <X size={14} weight="bold" /> : <Play size={14} weight="fill" />}
              <span>{stopping ? "Stopping…" : running ? "Stop" : "Run"}</span>
            </button>
          </div>
        </div>

        {/* Subbar */}
        <div className="code-subbar">
          {mode === "scratch" ? (
            <div className="code-subbar-left">
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
              <span className="code-buffer-label">
                Scratch · main.{(starters as Record<string, string>)[language] && {
                  javascript: "js",
                  python: "py",
                  c: "c",
                  cpp: "cpp",
                  go: "go",
                  rust: "rs",
                  java: "java",
                  bash: "sh"
                }[language]}
              </span>
              <span className="caret-pos-indicator hide-mobile">
                Ln {caretPos.line}, Col {caretPos.col}
              </span>
            </div>
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
                  if (isDirty && !confirmDiscard()) return;
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
              {isDirty && <span className="dirty-dot" title="Unsaved changes" aria-label="Unsaved changes" />}
            </div>
          )}

          <div className="spacer" />

          <div className="code-action-buttons">
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
              className={`icon-btn code-overflow-trigger ${overflowOpen ? "active" : ""}`}
              onClick={() => setOverflowOpen(!overflowOpen)}
              title="More editor actions"
              aria-label="More editor actions"
            >
              <DotsThree size={18} weight="bold" />
            </button>
          </div>

          {overflowOpen && (
            <div className="code-overflow-menu" onKeyDown={(e) => { if (e.key === "Escape") setOverflowOpen(false); }}>
              <button
                type="button"
                className={highlight ? "active" : ""}
                title="Show highlighting"
                aria-label="Show highlighting"
                onClick={() => {
                  setHighlight((value) => !value);
                  setOverflowOpen(false);
                }}
              >
                {highlight ? <EyeSlash size={16} /> : <Eye size={16} />}
                <span>{highlight ? "Hide Highlighting" : "Show Highlighting"}</span>
              </button>
              <button
                type="button"
                title="Indent selection"
                aria-label="Indent selection"
                onClick={() => {
                  indent(false);
                  setOverflowOpen(false);
                }}
              >
                <TextIndent size={16} />
                <span>Indent selection</span>
              </button>
              <button
                type="button"
                title="Outdent selection"
                aria-label="Outdent selection"
                onClick={() => {
                  indent(true);
                  setOverflowOpen(false);
                }}
              >
                <TextOutdent size={16} />
                <span>Outdent selection</span>
              </button>
              <button
                type="button"
                className={panelOpen && activeTab === "terminal" ? "active" : ""}
                onClick={() => {
                  setPanelOpen(true);
                  setActiveTab("terminal");
                  setOverflowOpen(false);
                }}
              >
                <Terminal size={16} />
                <span>Terminal Input (stdin)</span>
              </button>
              {mode === "saved" && (
                <button
                  type="button"
                  className={drawerOpen ? "active" : ""}
                  onClick={() => {
                    setDrawerOpen(!drawerOpen);
                    setOverflowOpen(false);
                  }}
                >
                  <FolderOpen size={16} />
                  <span>Project Files</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Saved Files Drawer overlay if open */}
        {mode === "saved" && drawerOpen && (
          <aside className="compiler-files drawer-open" role="dialog" aria-modal="false" aria-label="Saved files" onKeyDown={event=>{if(event.key==="Escape")setDrawerOpen(false)}}>
            <div className="compiler-files-header">
              <span>Saved files</span>
              <div className="compiler-files-search">
                <MagnifyingGlass size={14} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Filter files..."
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  aria-label="Filter saved files"
                />
              </div>
              <button type="button" className="icon-btn" onClick={() => setDrawerOpen(false)} title="Close files" aria-label="Close saved files">
                <X size={14} />
              </button>
            </div>
            <div className="compiler-tree-container">
              {fileTree.length === 0 ? (
                <div className="compiler-empty-files"><p>No saved files found.</p><button type="button" className="primary" onClick={()=>{setDrawerOpen(false);setFilePath("");setCode(starters[language]);setOriginalContent(starters[language])}}>Create first file</button></div>
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

        {/* Code Editor Stack with Line Numbers Gutter */}
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
              onClick={() => {
                updateCaretPos();
                const el = textareaRef.current;
                if (el && el.selectionStart !== el.selectionEnd) {
                  setSelectedText(el.value.slice(el.selectionStart, el.selectionEnd));
                } else {
                  setSelectedText("");
                }
              }}
              onKeyUp={() => {
                updateCaretPos();
                const el = textareaRef.current;
                if (el && el.selectionStart !== el.selectionEnd) {
                  setSelectedText(el.value.slice(el.selectionStart, el.selectionEnd));
                } else {
                  setSelectedText("");
                }
              }}
              onSelect={() => {
                const el = textareaRef.current;
                if (el && el.selectionStart !== el.selectionEnd) {
                  setSelectedText(el.value.slice(el.selectionStart, el.selectionEnd));
                } else {
                  setSelectedText("");
                }
              }}
              onFocus={() => setIsEditing(true)}
              onBlur={() => {
                setTimeout(() => {
                  if (document.activeElement !== textareaRef.current) {
                    setIsEditing(false);
                  }
                }, 200);
              }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              aria-label="Source code"
            />
          </div>

          {/* Floating Contextual AI Bar when code is selected */}
          {selectedText && (
            <div className="code-selection-ai-bar">
              <button
                type="button"
                className="selection-ai-btn"
                onClick={() => {
                  setTutorPrompt(`Explain this code snippet:\n\`\`\`${language}\n${selectedText}\n\`\`\``);
                  setTutorOpen(true);
                }}
              >
                Explain
              </button>
              <button
                type="button"
                className="selection-ai-btn"
                onClick={() => {
                  setTutorPrompt(`Fix bugs or issues in this code snippet:\n\`\`\`${language}\n${selectedText}\n\`\`\``);
                  setTutorOpen(true);
                }}
              >
                Fix
              </button>
              <button
                type="button"
                className="selection-ai-btn"
                onClick={() => {
                  setTutorPrompt(`Refactor and optimize this code snippet:\n\`\`\`${language}\n${selectedText}\n\`\`\``);
                  setTutorOpen(true);
                }}
              >
                Refactor
              </button>
              <button
                type="button"
                className="selection-ai-btn primary"
                onClick={() => {
                  setTutorPrompt(`I have a question about this code snippet:\n\`\`\`${language}\n${selectedText}\n\`\`\``);
                  setTutorOpen(true);
                }}
              >
                <Sparkle size={13} />
                <span>✦ Ask</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Sheet Output & Terminal Dock Panel */}
        {panelOpen && (
          <div className="code-bottom-sheet" role="region" aria-label="Output and terminal panel">
            <div className="code-sheet-header">
              <div className="code-sheet-tabs">
                <button
                  type="button"
                  className={`code-tab ${activeTab === "output" ? "active" : ""}`}
                  onClick={() => setActiveTab("output")}
                >
                  Output
                </button>
                <button
                  type="button"
                  className={`code-tab ${activeTab === "terminal" ? "active" : ""}`}
                  onClick={() => setActiveTab("terminal")}
                >
                  Terminal
                </button>
                <button
                  type="button"
                  className={`code-tab ${activeTab === "problems" ? "active" : ""}`}
                  onClick={() => setActiveTab("problems")}
                >
                  Problems {error || (result && result.code !== 0) ? "(1)" : ""}
                </button>
              </div>
              <button
                type="button"
                className="icon-btn code-sheet-close"
                onClick={() => setPanelOpen(false)}
                title="Close panel"
                aria-label="Close panel"
              >
                <X size={14} />
              </button>
            </div>

            <div className="code-sheet-body">
              {activeTab === "output" && (
                <div className="code-tab-content">
                  <pre className={`code-out-body ${error ? "oe" : ""}`}>
                    {error || result?.output || "(No output)"}
                  </pre>
                  {(result || error) && (
                    <div className="code-run-status">
                      {error ? (
                        <span className="err-badge">
                          <WarningCircle size={14} />
                          <span>Compilation error</span>
                        </span>
                      ) : (
                        <span className="ok-badge">
                          <CheckCircle size={14} />
                          <span>Process exited with code {result?.code} · {(result?.durationMs! / 1000).toFixed(2)}s</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "terminal" && (
                <div className="code-tab-content terminal-mode">
                  <label className="stdin-label">Program Input (stdin)</label>
                  <textarea
                    value={stdin}
                    onChange={(event) => setStdin(event.target.value)}
                    placeholder="Program input (stdin)..."
                    rows={3}
                    aria-label="Standard input"
                  />
                </div>
              )}

              {activeTab === "problems" && (
                <div className="code-tab-content problems-mode">
                  {error ? (
                    <div className="problem-item err">
                      <WarningCircle size={15} />
                      <span>{error}</span>
                    </div>
                  ) : result && result.code !== 0 ? (
                    <div className="problem-item err">
                      <WarningCircle size={15} />
                      <span>Process exited with non-zero exit code ({result.code})</span>
                    </div>
                  ) : (
                    <div className="problem-item clean">
                      <CheckCircle size={15} />
                      <span>No errors or problems detected.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Symbol Bar & Joystick (Language-Aware & Focus-Gated) */}
        <div className={`code-symbols-wrap ${isEditing ? "editing-active" : ""}`}>
          <div className="code-symbols">
            {(LANG_KEYS[language] || LANG_KEYS.javascript).map((k) => (
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
            code: tutorPrompt ? `${tutorPrompt}\n\n${code}` : code
          }}
          onApply={(value) => {
            if (value) updateCode(value);
            setTutorPrompt(undefined);
          }}
          onClose={() => {
            setTutorOpen(false);
            setTutorPrompt(undefined);
          }}
        />
      )}
    </ModuleShell>
  );
}
