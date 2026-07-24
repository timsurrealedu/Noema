"use client";

import {useEffect, useState} from "react";
import {ArrowClockwise, CloudSlash, X} from "@phosphor-icons/react";

export function PWARegister(){const [offline,setOffline]=useState(false);const [update,setUpdate]=useState<ServiceWorkerRegistration|null>(null);useEffect(()=>{const sync=()=>setOffline(!navigator.onLine);addEventListener("online",sync);addEventListener("offline",sync);sync();if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").then(registration=>{registration.addEventListener("updatefound",()=>setUpdate(registration))});return()=>{removeEventListener("online",sync);removeEventListener("offline",sync)}},[]);return <>{offline&&<div className="connection-state" role="status"><CloudSlash/><span><strong>You’re offline</strong><small>Captures remain on this device and sync when connected.</small></span></div>}{update&&<div className="update-toast" role="status"><ArrowClockwise/><span>A LifeOS update is ready.</span><button onClick={()=>location.reload()}>Refresh</button><button className="icon-button" aria-label="Dismiss update" onClick={()=>setUpdate(null)}><X/></button></div>}</>}
