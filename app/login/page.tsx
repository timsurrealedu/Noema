"use client";

import Link from "next/link";
import {FormEvent,useState} from "react";
import {ArrowRight,Key,ShieldCheck} from "@phosphor-icons/react";
import {useRouter} from "next/navigation";

export default function LoginPage(){
  const router=useRouter(),[error,setError]=useState(""),[pending,setPending]=useState(false),[mfa,setMfa]=useState(false),[credentials,setCredentials]=useState({email:"",password:""});
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setPending(true);setError("");const form=new FormData(event.currentTarget),email=String(form.get("email")||credentials.email),password=String(form.get("password")||credentials.password),totpCode=String(form.get("totpCode")||"");
    try{const response=await fetch("/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,totpCode})}),result=await response.json();if(response.status===202&&result.mfaRequired){setCredentials({email,password});setMfa(true);return}if(!response.ok)throw new Error(result.error?.message||"Sign-in failed");router.replace("/");router.refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Sign-in failed")}finally{setPending(false)}
  }
  return <main className="auth-page"><section className="auth-panel"><Link className="brand" href="/"><span className="brand-mark"/>LifeOS</Link><div><h1>{mfa?"Verify it’s you":"Welcome back"}</h1><p>{mfa?"Enter the code from your authenticator app.":"Sign in to your private workspace."}</p></div><form onSubmit={submit}>{mfa?<label>Authenticator code<input name="totpCode" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required/></label>:<><label>Email address<input name="email" type="email" defaultValue="tim@example.com" autoComplete="email" spellCheck={false} required/></label><label>Password<input name="password" type="password" autoComplete="current-password" minLength={12} required/></label></>}{error&&<p role="alert" className="auth-error">{error}</p>}<button className="primary" disabled={pending}>{pending?"Signing in…":<>{mfa?"Verify code":"Continue securely"}<ArrowRight/></>}</button>{mfa&&<button type="button" className="secondary" onClick={()=>{setMfa(false);setCredentials({email:"",password:""})}}>Use another account</button>}</form><div className="auth-security"><ShieldCheck/><span><strong>Private session</strong><small>Authentication is handled by your self-hosted LifeOS backend.</small></span></div></section><aside><Key/><h2>Your context, available when you need it.</h2><p>Capture, plan, study, and build without losing the relationships between them.</p></aside></main>;
}
