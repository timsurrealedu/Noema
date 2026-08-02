"use client";

import {useEffect, useMemo, useState} from "react";
import {
  ArrowClockwise, ArrowLeft, ArrowSquareOut, CalendarBlank, Check, CheckCircle, CheckSquare,
  CircleNotch, File, Globe, Keyboard, Microphone, Note, PenNib, Plus, Sparkle, WarningCircle, X
} from "@phosphor-icons/react";
import {Capture, CaptureSource, useAppState} from "../components/AppState";
import {ModuleShell} from "../components/ModuleShell";

const filters=["All","Needs review","Processing","Done","Failed"] as const;
type Filter=(typeof filters)[number];

const statusMeta={
  queued:{label:"Queued",Icon:CircleNotch}, processing:{label:"Processing",Icon:CircleNotch}, review:{label:"Needs review",Icon:Sparkle},
  confirmed:{label:"Done",Icon:CheckCircle}, failed:{label:"Failed",Icon:WarningCircle},
  dismissed:{label:"Dismissed",Icon:X},
} as const;
const sourceMeta:Record<CaptureSource,{label:string;Icon:typeof Keyboard}>={
  typed:{label:"Typed",Icon:Keyboard}, voice:{label:"Voice",Icon:Microphone},
  file:{label:"File",Icon:File}, link:{label:"Web link",Icon:Globe}, handwriting:{label:"Handwriting",Icon:PenNib},
};

function timeFor(value:string){return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date(value))}
function matches(capture:Capture,filter:Filter){if(filter==="All")return true;if(filter==="Processing")return capture.status==="queued"||capture.status==="processing";return capture.status===({"Needs review":"review","Done":"confirmed","Failed":"failed"} as const)[filter]}

export default function CaptureInbox(){
  const {addCapture,cancelInterpretation,captures,confirmCapture,requestInterpretation,updateCapture}=useAppState();
  const [filter,setFilter]=useState<Filter>("All");
  const visible=useMemo(()=>captures.filter(item=>item.status!=="dismissed"&&matches(item,filter)),[captures,filter]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [detailOpen,setDetailOpen]=useState(false);
  const [toast,setToast]=useState<{id:string;message:string;previous:Capture["status"]}|null>(null);
  const selected=visible.find(item=>item.id===selectedId)??visible[0];

  useEffect(()=>{const params=new URLSearchParams(location.search),open=params.get("open"),shared=[params.get("title"),params.get("text"),params.get("url")].filter(Boolean).join("\n");if(open&&captures.some(item=>item.id===open)){setFilter("All");setSelectedId(open);setDetailOpen(true)}else if(shared){setSelectedId(addCapture(shared));history.replaceState(null,"","/capture")}},[captures]);
  useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(null),6000);return()=>clearTimeout(timer)}},[toast]);

  function choose(id:string){setSelectedId(id);setDetailOpen(true)}
  function changeStatus(capture:Capture,status:Capture["status"],message:string){
    updateCapture(capture.id,status);setToast({id:capture.id,message,previous:capture.status});
    if(status==="dismissed"){setSelectedId(null);setDetailOpen(false)}
  }
  function retry(capture:Capture){
    setFilter("All");setSelectedId(capture.id);requestInterpretation(capture.id);setToast({id:capture.id,message:"Processing started again",previous:"failed"});
  }
  function confirm(capture:Capture){if(!capture.objects.length){changeStatus(capture,"confirmed","Capture confirmed");return}confirmCapture(capture.id);setToast({id:capture.id,message:"Capture confirmed and objects created",previous:capture.status})}
  function undo(){if(!toast)return;updateCapture(toast.id,toast.previous);setSelectedId(toast.id);setToast(null)}

  return <ModuleShell active="Capture" title="Capture inbox" action={<a className="primary top-primary" href="/#capture"><Plus/>Quick capture</a>}>
    <div className={`capture-inbox ${detailOpen?"detail-open":""}`}>
      <section className="capture-list-pane" aria-label="Capture inbox">
        <div className="capture-intro"><div><h2>Review what Noema understood</h2><p>Every interpretation stays visible and reversible.</p></div></div>
        <div className="capture-filters" role="tablist" aria-label="Capture status">
          {filters.map(item=>{const count=item==="All"?captures.filter(c=>c.status!=="dismissed").length:captures.filter(c=>matches(c,item)).length;return <button key={item} role="tab" aria-selected={filter===item} className={filter===item?"active":""} onClick={()=>{setFilter(item);setSelectedId(null)}}>{item}<span>{count}</span></button>})}
        </div>
        {visible.length?<div className="capture-groups">
          <h3>Recent captures</h3>
          <div className="capture-rows">{visible.map(capture=><CaptureRow capture={capture} selected={selected?.id===capture.id} onSelect={()=>choose(capture.id)} onRetry={()=>retry(capture)} key={capture.id}/>)}</div>
        </div>:<div className="capture-empty"><CheckCircle/><h3>{filter==="All"?"Inbox clear":`No ${filter.toLowerCase()} captures`}</h3><p>{filter==="All"?"New captures will appear here with their source and interpretation.":"Choose another status to keep reviewing your inbox."}</p>{filter!=="All"&&<button className="secondary" onClick={()=>setFilter("All")}>Show all captures</button>}</div>}
      </section>

      <aside className="capture-inspector" aria-label="Capture details">
        {selected?<>
          <header className="inspector-head"><button className="icon-button mobile-detail-back" aria-label="Back to capture list" onClick={()=>setDetailOpen(false)}><ArrowLeft/></button><div><span>Original capture</span><time>{timeFor(selected.createdAt)}</time></div><span className={`capture-source ${selected.source}`}><SourceIcon source={selected.source}/>{sourceMeta[selected.source].label}</span></header>
          <div className="original-capture"><p>{selected.text}</p><span>{selected.sourceLabel}</span></div>
          {(selected.status==="queued"||selected.status==="processing")&&<section className="processing-panel" aria-live="polite"><CircleNotch className="spin"/><div><strong>{selected.status==="queued"?"Queued for processing":"Interpreting this capture"}</strong><span>{selected.status==="queued"?"The original ink is safely stored and waiting for Process Inbox.":"Reading the source and identifying useful objects."}</span><i><b style={{width:`${selected.progress??(selected.status==="queued"?8:28)}%`}}/></i></div><em>{selected.progress??(selected.status==="queued"?8:28)}%</em>{selected.jobId&&<button className="secondary" onClick={()=>cancelInterpretation(selected.id)}>Cancel</button>}</section>}
          {selected.status==="failed"&&<section className="failure-panel" role="alert"><WarningCircle/><div><strong>Processing failed</strong><p>{selected.error}</p></div><button className="secondary" onClick={()=>retry(selected)}><ArrowClockwise/>Try again</button></section>}
          {selected.status==="confirmed"&&selected.handwriting&&<section className="handwriting-result"><div className="interpretation-head"><div><Sparkle/><span><strong>{selected.handwriting.title}</strong><small>Handwriting processing complete.</small></span></div><span className="capture-status status-confirmed"><CheckCircle/>Done</span></div><dl><div><dt>Folder</dt><dd>{selected.handwriting.folder}</dd></div><div><dt>AI action</dt><dd>{selected.handwriting.action||"None"}</dd></div><div><dt>Confidence</dt><dd>{selected.handwriting.confidence===null?"Not applicable":`${Math.round(selected.handwriting.confidence*100)}%`}</dd></div><div><dt>Source ink</dt><dd>Editable · {selected.handwriting.inkBlockId}</dd></div></dl><a className="primary" href={`/vault?open=${selected.handwriting.noteId}`}>Open note<ArrowSquareOut/></a></section>}
          {(selected.status==="review"||selected.status==="confirmed"&&!selected.handwriting)&&<>
            <section className="interpretation-head"><div><Sparkle/><span><strong>Interpretation</strong><small>{selected.status==="review"?"Check the detected objects before confirming.":"This interpretation has been confirmed."}</small></span></div><span className={`capture-status status-${selected.status}`}><StatusIcon capture={selected}/>{statusMeta[selected.status].label}</span></section>
            <section className="detected-objects" aria-labelledby="detected-title"><h3 id="detected-title">Detected objects <span>{selected.objects.length}</span></h3>{selected.objects.map((object,index)=><article key={`${object.type}-${index}`}><span className={`object-icon ${object.type}`}>{object.type==="task"?<CheckSquare/>:object.type==="event"?<CalendarBlank/>:<Note/>}</span><div><small>{object.type==="vault"?"Vault note":object.type}</small><strong>{object.title}</strong><p>{object.detail}</p></div><CheckCircle aria-label="Ready to confirm"/></article>)}</section>
            <section className="source-relationship"><h3>Source relationship</h3><div><SourceIcon source={selected.source}/><span><strong>Original source preserved</strong><small>{selected.sourceLabel}</small></span><Check/></div>{selected.assets?.map(asset=><div key={asset.id}><File/><span><strong>{asset.name}</strong><small>{asset.mime} · {asset.size>1048576?`${(asset.size/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(asset.size/1024))} KB`}</small></span><a className="row-action" href={`/api/v1/assets/${asset.id}`} target="_blank" rel="noreferrer" aria-label={`Open original ${asset.name}`}><ArrowSquareOut/></a></div>)}</section>
          </>}
          <footer className="inspector-actions">
            {selected.status==="review"&&<><button className="secondary" onClick={()=>changeStatus(selected,"dismissed","Capture dismissed")}>Dismiss</button>{selected.objects.length===0&&<button className="secondary" onClick={()=>requestInterpretation(selected.id)}><Sparkle/>Interpret</button>}<button className="primary" onClick={()=>confirm(selected)}><Check/>Confirm all</button></>}
            {selected.status==="confirmed"&&<button className="secondary" onClick={()=>changeStatus(selected,"review","Capture reopened for review")}>Reopen review</button>}
          </footer>
        </>:<div className="inspector-empty"><Sparkle/><h3>Select a capture</h3><p>Its source, interpretation, and actions will appear here.</p></div>}
      </aside>
    </div>
    {toast&&<div className="undo-toast" role="status"><CheckCircle/><span>{toast.message}</span><button onClick={undo}>Undo</button><button aria-label="Dismiss notification" onClick={()=>setToast(null)}><X/></button></div>}
  </ModuleShell>
}

function SourceIcon({source}:{source:CaptureSource}){const Icon=sourceMeta[source].Icon;return <Icon/>}
function StatusIcon({capture}:{capture:Capture}){const Icon=statusMeta[capture.status].Icon;return <Icon className={capture.status==="processing"?"spin":""}/>}
function CaptureRow({capture,selected,onSelect,onRetry}:{capture:Capture;selected:boolean;onSelect:()=>void;onRetry:()=>void}){
  return <article className={`capture-row ${selected?"selected":""}`}><button className="capture-row-main" onClick={onSelect} aria-current={selected?"true":undefined}><span className={`source-icon ${capture.source}`}><SourceIcon source={capture.source}/></span><span className="capture-copy"><strong>{capture.text}</strong><small>{timeFor(capture.createdAt)} · {sourceMeta[capture.source].label}</small></span><span className={`capture-status status-${capture.status}`}><StatusIcon capture={capture}/>{statusMeta[capture.status].label}</span></button>{capture.status==="processing"&&<i aria-label={`${capture.progress}% processed`}><b style={{width:`${capture.progress}%`}}/></i>}{capture.status==="failed"&&<button className="row-retry" onClick={onRetry}><ArrowClockwise/>Retry</button>}</article>
}
