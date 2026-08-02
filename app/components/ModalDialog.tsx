"use client";

import {ReactNode,useEffect,useRef} from "react";

export function ModalDialog({className,onClose,children,ariaLabel="Search Noema"}:{className?:string;onClose:()=>void;children:ReactNode;ariaLabel?:string}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close()},[]);
  return <dialog ref={ref} className={className} aria-label={ariaLabel} onCancel={onClose}>{children}</dialog>;
}
