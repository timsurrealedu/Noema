import {ReactNode} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {Tag, CaretDown} from "@phosphor-icons/react";
import "katex/dist/katex.min.css";

export function extractTagsAndCleanText(text: string): { cleanText: string; tags: string[] } {
  const foundTags = new Set<string>();
  let cleanText = text || "";

  const addTagStr = (str: string) => {
    str.split(",").forEach(t => {
      const cleaned = t.trim().replace(/^\\?["']|\\?["']$/g, "").replace(/^\\?\[|\\?\]$/g, "").replace(/^#/, "").trim();
      if (cleaned) foundTags.add(cleaned);
    });
  };

  // 1. Extract from YAML frontmatter
  const frontmatterMatch = cleanText.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (frontmatterMatch) {
    const fmContent = frontmatterMatch[1];
    
    // tags: [tag1, tag2] or **tags**: [tag1, tag2] or ## tags: \[tag1, tag2\]
    const bracketMatch = fmContent.match(/(?:#{1,6}\s+)?(?:[-*+]\s+)?(?:\*\*|\*|_)?tags?(?:\*\*|\*|_)?(?::(?:\*\*|\*|_)?|\s)\s*\\?\[([^\]]+)\\?\]/i);
    if (bracketMatch) addTagStr(bracketMatch[1]);

    // multiline tags:
    const multilineMatch = fmContent.match(/(?:#{1,6}\s+)?(?:[-*+]\s+)?(?:\*\*|\*|_)?tags?(?:\*\*|\*|_)?(?::(?:\*\*|\*|_)?|\s)\s*\n((?:\s*[-*+]\s+[^\n]+\r?\n?)+)/i);
    if (multilineMatch) {
      multilineMatch[1].split("\n").forEach(line => {
        const match = line.match(/\s*[-*+]\s*(.+)/);
        if (match) addTagStr(match[1]);
      });
    }

    // comma tags:
    const commaMatch = fmContent.match(/(?:#{1,6}\s+)?(?:[-*+]\s+)?(?:\*\*|\*|_)?tags?(?:\*\*|\*|_)?(?::(?:\*\*|\*|_)?|\s)\s*([^\n[\]]+)/i);
    if (commaMatch && !bracketMatch && !multilineMatch) addTagStr(commaMatch[1]);

    // Strip frontmatter
    cleanText = cleanText.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
  }

  // 2. Bracketed tag lines in body: e.g. `## tags: \[latihan, uas, ...]` or `tags: [latihan, uas]`
  const bracketRegex = /^\s*(?:#{1,6}\s+)?(?:[-*+]\s+)?(?:\*\*|\*|_)?tags?(?:\*\*|\*|_)?(?::(?:\*\*|\*|_)?|\s)\s*\\?\[([^\]]+)\\?\]\r?\n?/gim;
  for (const m of cleanText.matchAll(bracketRegex)) {
    addTagStr(m[1]);
  }
  cleanText = cleanText.replace(bracketRegex, "");

  // 3. Multiline tag lines in body: e.g. `## tags:\n - latihan\n - uas`
  const multilineRegex = /^\s*(?:#{1,6}\s+)?(?:[-*+]\s+)?(?:\*\*|\*|_)?tags?(?:\*\*|\*|_)?(?::(?:\*\*|\*|_)?|\s)\s*\n((?:\s*[-*+]\s+[^\n]+\r?\n?)+)/gim;
  for (const m of cleanText.matchAll(multilineRegex)) {
    m[1].split("\n").forEach(line => {
      const match = line.match(/\s*[-*+]\s*(.+)/);
      if (match) addTagStr(match[1]);
    });
  }
  cleanText = cleanText.replace(multilineRegex, "");

  // 4. Comma tag lines in body: e.g. `## tags: latihan, uas`
  const commaRegex = /^\s*(?:#{1,6}\s+)?(?:[-*+]\s+)?(?:\*\*|\*|_)?tags?(?:\*\*|\*|_)?(?::(?:\*\*|\*|_)?|\s)\s*([^\n[\]]+)\r?\n?/gim;
  for (const m of cleanText.matchAll(commaRegex)) {
    addTagStr(m[1]);
  }
  cleanText = cleanText.replace(commaRegex, "");

  // 5. Standalone hashtag lines in body (e.g. `#latihan #uas #integration #simpson`)
  const standaloneHashtagLineRegex = /^\s*(?:#([a-zA-Z0-9_\-\/]+)\s*)+$/gm;
  for (const m of cleanText.matchAll(standaloneHashtagLineRegex)) {
    for (const h of m[0].matchAll(/#([a-zA-Z0-9_\-\/]+)/g)) {
      if (h[1]) foundTags.add(h[1]);
    }
  }

  return {
    cleanText: cleanText.trimStart(),
    tags: Array.from(foundTags)
  };
}

export function StructuredTags({ tags, onTagClick }: { tags: string[]; onTagClick?: (tag: string) => void }) {
  if (!tags || tags.length === 0) return null;

  const handleClick = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanTag = tag.startsWith("#") ? tag.slice(1) : tag;
    if (onTagClick) {
      onTagClick(cleanTag);
    } else {
      const searchUrl = `/vault?q=${encodeURIComponent('#' + cleanTag)}`;
      window.history.pushState(null, "", searchUrl);
      window.dispatchEvent(new Event("popstate"));
    }
  };

  return (
    <details className="note-structured-tags" open>
      <summary className="tags-summary">
        <Tag size={15} className="tag-icon" />
        <span className="tags-count">{tags.length} {tags.length === 1 ? "tag" : "tags"}</span>
        <CaretDown size={14} className="tags-chevron" />
      </summary>
      <div className="tags-list">
        {tags.map((tag) => {
          const displayTag = tag.startsWith("#") ? tag : `#${tag}`;
          return (
            <button
              key={tag}
              type="button"
              className="tag-pill"
              onClick={(e) => handleClick(tag, e)}
              title={`Filter notes by ${displayTag}`}
            >
              {displayTag}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function InteractiveMathBlock({ children, rawText }: { children: ReactNode; rawText?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawText || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleAskTutor = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = `Can you explain and verify this calculation step in detail?\n${rawText || ""}`;
    const tutorEvent = new CustomEvent("noema:ask-tutor", { detail: { prompt } });
    window.dispatchEvent(tutorEvent);
  };

  return (
    <div className="interactive-math-wrapper">
      <div className="math-action-bar">
        <button type="button" onClick={handleAskTutor} title="Ask Tutor about this step">
          🎓 Ask Tutor
        </button>
        <button type="button" onClick={handleCopy} title="Copy formula text">
          {copied ? "✓ Copied" : "📋 Copy LaTeX"}
        </button>
      </div>
      {children}
    </div>
  );
}

const basic=(text:string,key:string,onNavigateNote?:(target:string)=>void)=>{
  const processedText=text
    .replace(/\\?<br\s*\/?>/gi,"  \n")
    .replace(/(?<!\!)\\?\[\\?\[([^\]|#\n]+)(?:#([^\]|]+))?(?:\|([^\]\n]+))?\\?\]\\?\]/g,(_,target,section,alias)=>{
      const raw=target.trim(),display=alias?alias.trim():(section?`${raw}#${section.trim()}`:raw);
      return `[${display}](/vault?open=${encodeURIComponent(raw)})`;
    });
  const components={
    a:({href,children,...props}:any)=>{
      if(href&&href.includes("/vault?open=")){
        const target=decodeURIComponent(href.split("/vault?open=")[1]||"");
        return <a href={href} className="wikilink-anchor" onClick={event=>{
          event.preventDefault();
          if(onNavigateNote){onNavigateNote(target)}
          else{
            const url=`/vault?open=${encodeURIComponent(target)}`;
            window.history.pushState(null,"",url);
            window.dispatchEvent(new Event("popstate"));
          }
        }} {...props}>{children}</a>;
      }
      return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
    },
    table:({children,...props}:any)=>(
      <div className="table-scroll-wrapper" role="region" aria-label="Table data" tabIndex={0}>
        <table {...props}>{children}</table>
      </div>
    ),
    img:({src,alt,...props}:any)=>{
      if(!src||src.trim()==="")return null;
      return <img src={src} alt={alt||""} {...props}/>;
    },
    p:({children,node,...props}:any)=>{
      const textVal = String(node?.children?.map((c: any) => c.value || "").join("") || "").trim();
      if (/^\*\*(Total|Result|Akhir)\s*:\*\*/i.test(textVal) || /^(Result|Total)\s*:/i.test(textVal)) {
        return (
          <div className="math-result-block">
            <span className="math-result-badge">Result</span>
            <span>{children}</span>
          </div>
        );
      }
      if (/^Error\s*:\s*\|/i.test(textVal) || /^Validation\s*:/i.test(textVal)) {
        return (
          <div className="math-validation-block">
            <span className="sync-dot synced" />
            <span>{children}</span>
          </div>
        );
      }
      return <p {...props}>{children}</p>;
    },
    span:({className,children,...props}:any)=>{
      if(className&&className.includes("katex-display")){
        return (
          <InteractiveMathBlock rawText={props?.node?.children?.[0]?.value||""}>
            <span className={className} {...props}>{children}</span>
          </InteractiveMathBlock>
        );
      }
      return <span className={className} {...props}>{children}</span>;
    }
  };
  return <ReactMarkdown key={key} remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>{processedText}</ReactMarkdown>;
};

function Mermaid({source}:{source:string}){try{const lines=source.trim().split("\n"),edges=lines.slice(1).map(line=>line.match(/^\s*([\w-]+)(?:\[([^\]]+)\])?\s*-->\s*([\w-]+)(?:\[([^\]]+)\])?\s*$/)).filter(Boolean) as RegExpMatchArray[];if(!/^(graph|flowchart)\s+(TD|TB|LR)$/.test(lines[0])||!edges.length)throw new Error();const labels=new Map<string,string>();edges.forEach(match=>{labels.set(match[1],match[2]||match[1]);labels.set(match[3],match[4]||match[3])});const nodes=[...labels],height=Math.max(140,nodes.length*90);return <figure className="structured-content"><svg viewBox={`0 0 600 ${height}`} role="img" aria-label={`Flowchart: ${nodes.map(([,label])=>label).join(" to ")}`}><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"/></marker></defs>{edges.map((edge,index)=><line key={index} x1="300" y1={nodes.findIndex(([id])=>id===edge[1])*90+59} x2="300" y2={nodes.findIndex(([id])=>id===edge[3])*90+15} markerEnd="url(#arrow)"/>)}{nodes.map(([id,label],index)=><g key={id}><rect x="120" y={index*90+15} width="360" height="44" rx="8"/><text x="300" y={index*90+43} textAnchor="middle">{label}</text></g>)}</svg><figcaption>Mermaid flowchart</figcaption><details><summary>View Mermaid source</summary><pre><code>{source}</code></pre></details></figure>}catch{/* Diagram could not be rendered; View Mermaid source below. */return <figure className="structured-fallback"><figcaption>Diagram could not be rendered. Mermaid source:</figcaption><pre><code>{source}</code></pre></figure>}}
function Chart({source}:{source:string}){const rows=source.trim().split("\n").map(line=>{const [label,value]=line.split(",");return {label:label?.trim(),value:Number(value)}}).filter(row=>row.label&&Number.isFinite(row.value));if(!rows.length)return <pre><code>{source}</code></pre>;const max=Math.max(...rows.map(row=>row.value),1);return <figure className="structured-content"><svg viewBox={`0 0 600 ${rows.length*48+30}`} role="img" aria-label={`Bar chart: ${rows.map(row=>`${row.label} ${row.value}`).join(", ")}`}>{rows.map((row,index)=><g key={row.label}><text x="0" y={index*48+28}>{row.label}</text><rect x="150" y={index*48+8} width={400*row.value/max} height="28"/><text x={160+400*row.value/max} y={index*48+28}>{row.value}</text></g>)}</svg><table><caption>Chart data</caption><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody>{rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table><details><summary>View chart source</summary><pre><code>{source}</code></pre></details></figure>}

export function MarkdownContent({text,onNavigateNote,onTagClick}:{text:string;onNavigateNote?:(target:string)=>void;onTagClick?:(tag:string)=>void}){
  const { cleanText, tags } = extractTagsAndCleanText(text);
  const parts:ReactNode[]=[],pattern=/```(mermaid|chart)\s*\n([\s\S]*?)```/g;
  let start=0,match:RegExpExecArray|null,index=0;

  if (tags.length > 0) {
    parts.push(<StructuredTags key="structured-tags" tags={tags} onTagClick={onTagClick} />);
  }

  while((match=pattern.exec(cleanText))){
    parts.push(basic(cleanText.slice(start,match.index),`text-${index}`,onNavigateNote));
    parts.push(match[1]==="mermaid"?<Mermaid key={`block-${index}`} source={match[2]}/>:<Chart key={`block-${index}`} source={match[2]}/>);
    start=pattern.lastIndex;
    index++;
  }
  parts.push(basic(cleanText.slice(start),`text-${index}`,onNavigateNote));
  return <>{parts}</>;
}


