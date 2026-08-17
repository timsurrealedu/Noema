"use client";

import {useState, type RefObject} from "react";
import {ArrowCounterClockwise, ArrowClockwise, Code, DotsThree, LinkSimple, ListBullets, ListNumbers, MathOperations, Quotes, Table} from "@phosphor-icons/react";

type Action = {
  label: string;
  title: string;
  prefix: string;
  suffix?: string;
  placeholder?: string;
  block?: boolean;
  icon?: typeof Code;
};
const actions: Action[] = [
  {
    label: "H1",
    title: "Heading 1",
    prefix: "# ",
    placeholder: "Heading",
    block: true,
  },
  {
    label: "H2",
    title: "Heading 2",
    prefix: "## ",
    placeholder: "Heading",
    block: true,
  },
  {
    label: "H3",
    title: "Heading 3",
    prefix: "### ",
    placeholder: "Heading",
    block: true,
  },
  {
    label: "B",
    title: "Bold",
    prefix: "**",
    suffix: "**",
    placeholder: "bold text",
  },
  {
    label: "I",
    title: "Italic",
    prefix: "_",
    suffix: "_",
    placeholder: "italic text",
  },
  {
    label: "",
    title: "Bulleted list",
    prefix: "- ",
    placeholder: "List item",
    block: true,
    icon: ListBullets,
  },
  {
    label: "",
    title: "Numbered list",
    prefix: "1. ",
    placeholder: "List item",
    block: true,
    icon: ListNumbers,
  },
  {
    label: "",
    title: "Quote",
    prefix: "> ",
    placeholder: "Quote",
    block: true,
    icon: Quotes,
  },
  {
    label: "",
    title: "Link",
    prefix: "[",
    suffix: "](https://)",
    placeholder: "link text",
    icon: LinkSimple,
  },
  {
    label: "",
    title: "Inline code",
    prefix: "`",
    suffix: "`",
    placeholder: "code",
    icon: Code,
  },
  {
    label: "",
    title: "Inline math",
    prefix: "$",
    suffix: "$",
    placeholder: "E = mc^2",
    icon: MathOperations,
  },
];
const table = "| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |";
const equation = "$$\n\\begin{aligned}\nf(x) &= x^2\n\\end{aligned}\n$$";

export function MarkdownToolbar({textarea, onChange, onUndo, onRedo, canUndo = false, canRedo = false}: {textarea: RefObject<HTMLTextAreaElement | null>; onChange?: (value: string) => void; onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean}) {
  const [expanded, setExpanded] = useState(false);

  function insert(action: Action | string) {
    const field = textarea.current;
    if (!field) return;
    field.focus();
    const start = field.selectionStart,
      end = field.selectionEnd,
      selected = field.value.slice(start, end);
    let value: string, cursorStart: number, cursorEnd: number;
    if (typeof action === "string") {
      const before = start && field.value[start - 1] !== "\n" ? "\n\n" : "",
        after = end < field.value.length && field.value[end] !== "\n" ? "\n\n" : "\n";
      value = before + action + after;
      cursorStart = start + before.length;
      cursorEnd = cursorStart + action.length;
    } else {
      const before = action.block && start && field.value[start - 1] !== "\n" ? "\n" : "",
        content = selected || action.placeholder || "",
        suffix = action.suffix || "";
      value = before + action.prefix + content + suffix;
      cursorStart = start + before.length + action.prefix.length;
      cursorEnd = cursorStart + content.length;
    }
    field.setRangeText(value, start, end, "end");
    field.setSelectionRange(cursorStart, cursorEnd);
    onChange?.(field.value);
  }
  return (
    <div className={`markdown-toolbar ${expanded ? "expanded" : ""}`} role="toolbar" aria-label="Text formatting">
      <div className="toolbar-actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button type="button" title={action.title} aria-label={action.title} onClick={() => insert(action)} key={action.title}>
              {Icon ? <Icon size={18} /> : <span className={action.label === "I" ? "italic" : undefined}>{action.label}</span>}
            </button>
          );
        })}
        <span className="toolbar-separator" />
        <button type="button" title="Insert table" aria-label="Insert table" onClick={() => insert(table)}>
          <Table size={18} />
        </button>
        <button type="button" title="Insert display equation" aria-label="Insert display equation" onClick={() => insert(equation)}>
          <MathOperations size={18} />
          <small>Block</small>
        </button>
        {(onUndo || onRedo) && <><span className="toolbar-separator" /><button type="button" title="Undo" aria-label="Undo" onMouseDown={event => event.preventDefault()} onClick={onUndo} disabled={!canUndo}><ArrowCounterClockwise size={18} /></button><button type="button" title="Redo" aria-label="Redo" onMouseDown={event => event.preventDefault()} onClick={onRedo} disabled={!canRedo}><ArrowClockwise size={18} /></button></>}
      </div>
      <button type="button" className={`markdown-toolbar-more-btn ${expanded ? "active" : ""}`} title={expanded ? "Collapse toolbar" : "More formatting options"} aria-label={expanded ? "Collapse toolbar" : "More formatting options"} onClick={() => setExpanded(v => !v)}>
        <DotsThree size={20} />
      </button>
    </div>
  );
}

