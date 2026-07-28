"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {ArrowRight,CheckCircle,Clock,Code,FolderOpen,GitBranch,Plus,ShieldCheck,WarningCircle} from "@phosphor-icons/react";
import {ModuleShell} from "../components/ModuleShell";

type Approval={id:string;status:"pending"|"approved"|"consumed";risk:string;actionType:string;details:{summary:string;commands:string[];files:string[]};createdAt:string};
type Repository={id:string;name:string;path:string};
export default function CodingPage(){
  const [approvals,setApprovals]=useState<Approval[]>([]),[repositories,setRepositories]=useState<Repository[]>([]),[path,setPath]=useState(""),[name,setName]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  async function load(){try{const [approvalResponse,repoResponse]=await Promise.all([fetch("/api/v1/approvals"),fetch("/api/v1/repositories")]),approvalBody=await approvalResponse.json(),repoBody=await repoResponse.json();if(!approvalResponse.ok||!repoResponse.ok)throw new Error(approvalBody.error?.message||repoBody.error?.message||"Coding workspace is unavailable");setApprovals(approvalBody.approvals);setRepositories(repoBody.repositories)}catch(reason){setError(reason instanceof Error?reason.message:"Coding workspace is unavailable")}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  async function register(event:FormEvent){event.preventDefault();setError("");const response=await fetch("/api/v1/repositories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path,name})}),body=await response.json();if(!response.ok){setError(body.error?.message||"Repository could not be registered");return}setPath("");setName("");await load()}
  return <ModuleShell active="Coding" title="Coding" action={<Link className="primary top-primary" href="/coding/compiler"><Code/>New compiler run</Link>}>
    <div className="module-header"><div><h2>Mobile repository IDE</h2><p>Browse, edit, review, test, commit, and revert explicitly allowed local Git repositories.</p></div></div>
    <section className="permission-note"><ShieldCheck/><span><strong>Every mutation has an exact approval boundary</strong><small>Paths are confined to configured roots. File writes use content hashes; commands are allowlisted, isolated, time-limited, and audited.</small></span></section>
    <section><div className="list-title"><h3>Repositories</h3><span>{repositories.length} registered</span></div>
      <form className="repo-register" onSubmit={register}><label>Name <input value={name} onChange={event=>setName(event.target.value)} placeholder="Noema" maxLength={100}/></label><label>Allowed local path <input value={path} onChange={event=>setPath(event.target.value)} placeholder="/srv/code/noema" required/></label><button className="primary"><Plus/>Register</button></form>
      {error&&<p className="auth-error" role="alert">{error}</p>}{loading?<p role="status">Loading repositories…</p>:repositories.length?<div className="repo-cards">{repositories.map(repo=><Link href={`/coding/repositories/${repo.id}`} className="repo-card" key={repo.id}><FolderOpen/><span><strong>{repo.name}</strong><small>{repo.path}</small></span><ArrowRight/></Link>)}</div>:<div className="empty-state"><GitBranch/><h3>No repositories registered</h3><p>Register a path inside <code>NOEMA_REPOSITORY_ROOTS</code>.</p></div>}
    </section>
    <section><div className="list-title"><h3>Approval history</h3><span>{approvals.length} records</span></div>{approvals.length?<div className="session-list">{approvals.map(item=><article className="session-row" key={item.id}><span className={`session-state ${item.status==="consumed"?"success":item.status==="pending"?"warning":"active"}`}>{item.status==="consumed"?<CheckCircle/>:item.status==="pending"?<WarningCircle/>:<Clock/>}</span><div><strong>{item.details.summary||item.actionType}</strong><span>{item.details.commands.join(" · ")||"No command"}</span><small>{item.details.files.join(", ")||"No files"} · {item.risk} risk · {new Date(item.createdAt).toLocaleString()}</small></div><em>{item.status}</em></article>)}</div>:<p>No approval history yet.</p>}</section>
  </ModuleShell>
}
