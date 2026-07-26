"use client";

import {WarningCircle, X} from "@phosphor-icons/react";
import {useEffect, useState} from "react";

const fallback="AI and server persistence aren’t connected yet. Supported changes are saved only in this browser.";
const remoteActions=/^(approve once|back up now|cancel run|change|confirm all|confirm and create cards|delete|edit plan|edit profile|link item|mark ready to submit|new automation|new project|new session|open camera|pause|resume|retry from failure|revoke|save draft|save schedule|save changes|set up|start first step)$/i;

export function ServiceNotice(){
  const [message,setMessage]=useState<string|null>(null);
  useEffect(()=>{
    const click=(event:MouseEvent)=>{
      const target=(event.target as HTMLElement).closest<HTMLElement>("[data-unavailable]");
      if(target)setMessage(target.dataset.unavailable||fallback);
      else {
        const button=(event.target as HTMLElement).closest<HTMLButtonElement>("button");
        const action=button?.textContent?.trim()||"";
        if(/^export workspace$/i.test(action))location.assign("/api/v1/export");
        else if(button&&remoteActions.test(action))setMessage(fallback);
      }
    };
    const notice=(event:Event)=>setMessage((event as CustomEvent<string>).detail||fallback);
    document.addEventListener("click",click);
    addEventListener("lifeos:unavailable",notice);
    return()=>{document.removeEventListener("click",click);removeEventListener("lifeos:unavailable",notice)};
  },[]);
  if(!message)return null;
  return <aside className="service-notice" role="alert"><WarningCircle/><span><strong>Not connected yet</strong><small>{message}</small></span><button className="icon-button" aria-label="Dismiss connection notice" onClick={()=>setMessage(null)}><X/></button></aside>;
}

export function showUnavailable(message?:string){dispatchEvent(new CustomEvent("lifeos:unavailable",{detail:message||fallback}))}
