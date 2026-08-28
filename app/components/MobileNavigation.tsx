"use client";

import {Bell, BookOpen, CalendarBlank, Code, Command, FileText, Folder, Gear, House, Lightning, ListChecks, Plus, Tray, X} from "@phosphor-icons/react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {ModalDialog} from "./ModalDialog";

const primaryNav=[["Home","/",House],["Capture","/capture",Plus],["Vault","/vault",Folder],["Calendar","/calendar",CalendarBlank]] as const;
const moreNav=[["Coding","/coding",Code],["Study","/study",BookOpen],["Projects","/projects",Tray],["Automations","/automations",Lightning],["Dashboards","/dashboards",Command],["Plugins","/plugins",FileText],["Collaboration","/collaboration",Bell],["Help","/help",Command],["Settings","/settings",Gear]] as const;
const matches=(pathname:string,href:string)=>href==="/"?pathname===href:pathname===href||pathname.startsWith(`${href}/`);

export function MobileNavigation(){
  const pathname=usePathname(),[more,setMore]=useState(false);
  if(pathname==="/login"||pathname==="/join"||pathname.startsWith("/assets/")||pathname==="/coding/compiler")return null;
  return <>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {primaryNav.map(([label,href,Icon])=><Link className={matches(pathname,href)?"active":""} aria-current={matches(pathname,href)?"page":undefined} href={href} key={label}><Icon/><span>{label}</span></Link>)}
      <button className={moreNav.some(([,href])=>matches(pathname,href))?"active":""} aria-expanded={more} aria-haspopup="dialog" onClick={()=>setMore(true)}><ListChecks/><span>More</span></button>
    </nav>
    {more&&<ModalDialog className="more-dialog" ariaLabel="More navigation" onClose={()=>setMore(false)}><header><strong>More</strong><button className="icon-button" aria-label="Close More navigation" onClick={()=>setMore(false)}><X/></button></header><nav aria-label="More navigation">{moreNav.map(([label,href,Icon])=><Link className={matches(pathname,href)?"active":""} href={href} onClick={()=>setMore(false)} key={label}><Icon/><span>{label}</span></Link>)}</nav></ModalDialog>}
  </>;
}
