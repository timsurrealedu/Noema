"use client";

import {useEffect, useRef} from "react";
import {Crepe} from "@milkdown/crepe";
import {replaceAll} from "@milkdown/utils";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

async function uploadImage(file:File){const form=new FormData();form.append("file",file);const response=await fetch("/api/v1/assets",{method:"POST",body:form}),body=await response.json();if(!response.ok)throw new Error(body.error?.message||"Image upload failed");const asset=body.assets?.[0];if(!asset?.id)throw new Error("Image upload returned no asset");return `/api/v1/assets/${asset.id}`}

export function LiveMarkdownEditor({value, onChange, onBlur}: {value: string; onChange: (value: string) => void; onBlur: () => void}) {
  const root = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLElement | null>(null);
  const latest = useRef(value);
  const change = useRef(onChange);
  const blur = useRef(onBlur);
  const crepe = useRef<Crepe | null>(null);
  change.current = onChange;
  blur.current = onBlur;

  function activateToolbar() {
    const topBar = topBarRef.current;
    const container = root.current?.closest(".integrated-doc-container") || root.current?.closest(".integrated-note-editor");
    if (!topBar || !container) return;
    container.querySelectorAll<HTMLElement>(".milkdown-top-bar").forEach(item => {
      item.hidden = item !== topBar;
      if (item !== topBar) item.classList.remove("is-expanded");
    });
  }

  useEffect(() => {
    if (!root.current) return;
    const editor = new Crepe({
      root: root.current,
      defaultValue: latest.current,
      features: {[Crepe.Feature.TopBar]: true},
      featureConfigs: {
        [Crepe.Feature.ImageBlock]: {onUpload: uploadImage},
        [Crepe.Feature.TopBar]: {
          headingOptions: [
            { label: "P", level: null },
            { label: "H1", level: 1 },
            { label: "H2", level: 2 },
            { label: "H3", level: 3 },
            { label: "H4", level: 4 },
            { label: "H5", level: 5 },
            { label: "H6", level: 6 }
          ]
        }
      }
    });
    editor.on(listener => {
      listener.markdownUpdated((_ctx, markdown) => {
        latest.current = markdown;
        change.current(markdown);
      });
      listener.blur(() => blur.current());
    });
    let disposed = false;
    let toolbarCleanup = () => {};
    void editor.create().then(() => {
      if (disposed) { void editor.destroy(); return; }
      crepe.current = editor;
      const topBar = root.current?.querySelector(".milkdown-top-bar") as HTMLElement | null;
      if (topBar) {
        const docContainer = root.current?.closest(".integrated-doc-container") || root.current?.closest(".integrated-note-editor");
        if (docContainer && topBar.parentElement !== docContainer) {
          docContainer.prepend(topBar);
        }
        topBarRef.current = topBar;
        const labels = ["Bold", "Italic", "Strikethrough", "Inline code", "Bulleted list", "Numbered list", "Task list", "Link", "Image", "Table", "Code block", "Equation", "Quote", "Horizontal rule"];
        const heading = topBar.querySelector<HTMLButtonElement>(".top-bar-heading-button");
        if (heading) {
          heading.setAttribute("aria-label", "Text style");
          heading.setAttribute("title", "Text style");
        }
        topBar.querySelectorAll<HTMLButtonElement>(".top-bar-item").forEach((button, index) => {
          const label = labels[index];
          if (!label) return;
          button.setAttribute("aria-label", label);
          button.setAttribute("title", label);
        });
        if (!topBar.querySelector(".top-bar-more-btn")) {
          const moreBtn = document.createElement("button");
          moreBtn.type = "button";
          moreBtn.className = "top-bar-more-btn";
          moreBtn.setAttribute("aria-label", "More formatting tools");
          moreBtn.setAttribute("title", "More formatting tools");
          moreBtn.setAttribute("aria-expanded", "false");
          moreBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M112,128a16,16,0,1,1,16,16A16,16,0,0,1,112,128ZM48,112a16,16,0,1,0,16,16A16,16,0,0,0,48,112Zm144,0a16,16,0,1,0,16,16A16,16,0,0,0,192,112Z"></path></svg>`;
          moreBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            topBar.classList.toggle("is-expanded");
            moreBtn.classList.toggle("active");
            moreBtn.setAttribute("aria-expanded", String(topBar.classList.contains("is-expanded")));
          });
          topBar.appendChild(moreBtn);
        }
        const otherVisible = [...(docContainer?.querySelectorAll<HTMLElement>(".milkdown-top-bar:not([hidden])") || [])].some(item => item !== topBar);
        topBar.hidden = otherVisible;
        const dismiss = (event: Event) => {
          if (topBar.contains(event.target as Node)) return;
          topBar.classList.remove("is-expanded");
          const more = topBar.querySelector<HTMLButtonElement>(".top-bar-more-btn");
          more?.classList.remove("active");
          more?.setAttribute("aria-expanded", "false");
        };
        const escape = (event: KeyboardEvent) => {
          if (event.key !== "Escape") return;
          topBar.classList.remove("is-expanded");
          const more = topBar.querySelector<HTMLButtonElement>(".top-bar-more-btn");
          more?.classList.remove("active");
          more?.setAttribute("aria-expanded", "false");
        };
        document.addEventListener("pointerdown", dismiss);
        document.addEventListener("keydown", escape);
        toolbarCleanup = () => {
          document.removeEventListener("pointerdown", dismiss);
          document.removeEventListener("keydown", escape);
        };
      }
    });
    return () => { disposed = true; toolbarCleanup(); topBarRef.current = null; crepe.current = null; void editor.destroy(); };
  }, []);

  useEffect(() => {
    if (!crepe.current || latest.current === value) return;
    latest.current = value;
    crepe.current.editor.action(replaceAll(value));
  }, [value]);

  return <div className="live-markdown-editor" ref={root} onFocusCapture={activateToolbar} />;
}
