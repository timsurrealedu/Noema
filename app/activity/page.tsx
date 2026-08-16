"use client";

import {createId} from "../lib/id";

import {useEffect,useState} from "react";
import {ArrowCounterClockwise,CalendarBlank,Check,FileText,Lightning,Sparkle,Warning} from "@phosphor-icons/react";
import {ModuleShell} from "../components/ModuleShell";

type AuditEvent={id:string;action:string;objectType:string;summary:string;reversible:boolean;createdAt:string};

const icons={event:CalendarBlank,note:FileText,automation:Lightning,capture:Sparkle,task:Check} as const;
const time=new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"});

export default function ActivityPage(){
  const [events,setEvents]=useState<AuditEvent[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{fetch("/api/v1/audit?limit=100").then(async response=>{if(!response.ok)throw new Error((await response.json()).error?.message||"Activity could not load");return response.json()}).then(result=>setEvents(result.events||[])).catch(reason=>setError(reason instanceof Error?reason.message:"Activity could not load")).finally(()=>setLoading(false))},[]);
  async function undo(event:AuditEvent){
    setError("");
    try{const response=await fetch(`/api/v1/audit/${event.id}/undo`,{method:"POST",headers:{"Idempotency-Key":createId()}});if(!response.ok)throw new Error((await response.json()).error?.message||"Undo failed");setEvents(current=>current.map(item=>item.id===event.id?{...item,reversible:false}:item))}catch(reason){setError(reason instanceof Error?reason.message:"Undo failed")}
  }
  return <ModuleShell active="Activity" title="Activity"><div className="module-header"><div><h2>Changes you can trace</h2><p>Review AI, system, and manual actions. Reversible changes remain available here.</p></div></div><section className="audit-list" aria-live="polite"><div className="list-title"><h3>Recent activity</h3><span>Latest 100 changes</span></div>{loading?<p>Loading activity…</p>:error?<div className="warning-text" role="alert"><Warning/>{error}</div>:events.length?events.map(event=>{const Icon=icons[event.objectType as keyof typeof icons]||FileText;return <article key={event.id}><span className="audit-icon"><Icon/></span><div><strong>{event.action} {event.objectType.replaceAll("_"," ")}</strong><span>{event.summary}</span><time dateTime={event.createdAt}>{time.format(new Date(event.createdAt))}</time></div>{event.reversible&&<button className="secondary" onClick={()=>undo(event)}><ArrowCounterClockwise/>Undo</button>}</article>}):<p>No activity yet. Changes to tasks, events, notes, captures, and projects will appear here.</p>}</section></ModuleShell>;
}
