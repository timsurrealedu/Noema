"use client";

import {ReactNode,useEffect,useRef} from "react";

export function ModalDialog({className,onClose,children}:{className?:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close()},[]);
  return <dialog ref={ref} className={className} aria-label="Search LifeOS" onCancel={onClose}>{children}</dialog>;
}
