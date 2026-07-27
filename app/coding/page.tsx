"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {ArrowRight,CheckCircle,Clock,Code,ShieldCheck,WarningCircle} from "@phosphor-icons/react";
import {ModuleShell} from "../components/ModuleShell";

type Approval={id:string;status:"pending"|"approved"|"consumed";risk:string;actionType:string;details:{summary:string;commands:string[];files:string[];diff:string};expiresAt:string;createdAt:string};

export default function CodingPage(){
  const [approvals,setApprovals]=useState<Approval[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{fetch("/api/v1/approvals").then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Approval history is unavailable");setApprovals(data.approvals)}).catch(reason=>setError(reason.message)).finally(()=>setLoading(false))},[]);
  return <ModuleShell active="Coding" title="Coding" action={<Link className="primary top-primary" href="/coding/compiler"><Code/>New run</Link>}>
    <div className="module-header"><div><h2>Run code with an exact review boundary</h2><p>The compiler creates a disposable isolated workspace. Every run requires recent MFA and a single-use approval bound to the reviewed source.</p></div></div>
    <section className="permission-note"><ShieldCheck/><span><strong>No background execution</strong><small>The command, affected file, and complete source are shown before approval. Editing the source invalidates that approval.</small></span><Link className="primary" href="/coding/compiler">Open compiler<ArrowRight/></Link></section>
    <section><div className="list-title"><h3>Approval history</h3><span>{approvals.length} records</span></div>
      {loading?<p role="status">Loading approval history…</p>:error?<p className="auth-error" role="alert">{error}</p>:approvals.length?<div className="session-list">{approvals.map(item=><article className="session-row" key={item.id}><span className={`session-state ${item.status==="consumed"?"success":item.status==="pending"?"warning":"active"}`}>{item.status==="consumed"?<CheckCircle/>:item.status==="pending"?<WarningCircle/>:<Clock/>}</span><div><strong>{item.details.summary||item.actionType}</strong><span>{item.details.commands.join(" · ")||"No command"}</span><small>{item.details.files.join(", ")||"No files"} · {item.risk} risk · {new Date(item.createdAt).toLocaleString()}</small></div><em>{item.status}</em></article>)}</div>:<div className="empty-state"><ShieldCheck/><h3>No approval history</h3><p>Reviewing a compiler run creates the first record.</p><Link className="secondary" href="/coding/compiler">Review a run</Link></div>}
    </section>
  </ModuleShell>
}
