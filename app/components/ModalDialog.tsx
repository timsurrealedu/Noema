"use client";

import {MouseEvent,ReactNode,useEffect,useRef} from "react";

export function ModalDialog({className,onClose,children,ariaLabel="Search Noema"}:{className?:string;onClose:()=>void;children:ReactNode;ariaLabel?:string}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close()},[]);
  function closeBackdrop(event:MouseEvent<HTMLDialogElement>){if(event.target===event.currentTarget)onClose()}
  return <dialog ref={ref} className={className} aria-label={ariaLabel} onCancel={onClose} onClick={closeBackdrop}>{children}</dialog>;
}
