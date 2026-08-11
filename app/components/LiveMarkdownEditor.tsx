"use client";

import {useEffect, useRef} from "react";
import {Crepe} from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

export function LiveMarkdownEditor({value, onChange, onBlur}: {value: string; onChange: (value: string) => void; onBlur: () => void}) {
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef(value);
  const change = useRef(onChange);
  const blur = useRef(onBlur);
  change.current = onChange;
  blur.current = onBlur;

  useEffect(() => {
    if (!root.current) return;
    const editor = new Crepe({
      root: root.current,
      defaultValue: latest.current,
      features: {[Crepe.Feature.TopBar]: true}
    });
    editor.on(listener => {
      listener.markdownUpdated((_ctx, markdown) => {
        latest.current = markdown;
        change.current(markdown);
      });
      listener.blur(() => blur.current());
    });
    void editor.create();
    return () => { void editor.destroy(); };
  }, []);

  return <div className="live-markdown-editor" ref={root} />;
}
