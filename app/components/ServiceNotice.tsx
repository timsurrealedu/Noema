"use client";

import {WarningCircle, X} from "@phosphor-icons/react";
import {useEffect, useState} from "react";

const fallback="AI and server persistence aren’t connected yet. Supported changes are saved only in this browser.";

export function ServiceNotice(){
  const [message,setMessage]=useState<string|null>(null);
  useEffect(()=>{
    const click=(event:MouseEvent)=>{
      const target=(event.target as HTMLElement).closest<HTMLElement>("[data-unavailable]");
      if(target)setMessage(target.dataset.unavailable||fallback);
    };
    const notice=(event:Event)=>setMessage((event as CustomEvent<string>).detail||fallback);
    document.addEventListener("click",click);
    addEventListener("noema:unavailable",notice);
    return()=>{document.removeEventListener("click",click);removeEventListener("noema:unavailable",notice)};
  },[]);
  if(!message)return null;
  return <aside className="service-notice" role="alert"><WarningCircle/><span><strong>Not connected yet</strong><small>{message}</small></span><button className="icon-button" aria-label="Dismiss connection notice" onClick={()=>setMessage(null)}><X/></button></aside>;
}

export function showUnavailable(message?:string){dispatchEvent(new CustomEvent("noema:unavailable",{detail:message||fallback}))}
