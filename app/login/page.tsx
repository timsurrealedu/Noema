"use client";

import Link from "next/link";
import {FormEvent, useState} from "react";
import {ArrowRight, Key, ShieldCheck} from "@phosphor-icons/react";
import {useRouter} from "next/navigation";

export default function LoginPage(){
  const router=useRouter();const [error,setError]=useState("");const [pending,setPending]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setPending(true);setError("");const form=new FormData(event.currentTarget);
    try{const response=await fetch("/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.get("email"),password:form.get("password")})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message||"Sign-in failed");router.replace("/");router.refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Sign-in failed")}finally{setPending(false)}
  }
  return <main className="auth-page"><section className="auth-panel"><Link className="brand" href="/"><span className="brand-mark"/>LifeOS</Link><div><h1>Welcome back</h1><p>Sign in to your private workspace.</p></div><form onSubmit={submit}><label>Email address<input name="email" type="email" defaultValue="tim@example.com" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" minLength={12} required/></label>{error&&<p role="alert" className="auth-error">{error}</p>}<button className="primary" disabled={pending}>{pending?"Signing in…":<>Continue securely<ArrowRight/></>}</button></form><div className="auth-security"><ShieldCheck/><span><strong>Private session</strong><small>Authentication is handled by your self-hosted LifeOS backend.</small></span></div></section><aside><Key/><h2>Your context, available when you need it.</h2><p>Capture, plan, study, and build without losing the relationships between them.</p></aside></main>;
}
