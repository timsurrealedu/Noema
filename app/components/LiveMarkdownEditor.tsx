"use client";

import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Crepe} from "@milkdown/crepe";
import {replaceAll} from "@milkdown/utils";
import type {Ctx} from "@milkdown/kit/ctx";
import {commandsCtx, editorViewCtx} from "@milkdown/kit/core";
import {addBlockTypeCommand, blockquoteSchema, bulletListSchema, codeBlockSchema, headingSchema, hrSchema, listItemSchema, orderedListSchema, paragraphSchema, setBlockTypeCommand, toggleEmphasisCommand, toggleInlineCodeCommand, toggleStrongCommand, wrapInBlockTypeCommand} from "@milkdown/kit/preset/commonmark";
import {createTable, toggleStrikethroughCommand} from "@milkdown/kit/preset/gfm";
import {imageBlockSchema} from "@milkdown/kit/component/image-block";
import {toggleLinkCommand} from "@milkdown/kit/component/link-tooltip";
import {undoCommand, redoCommand} from "@milkdown/kit/plugin/history";
import {ArrowCounterClockwise, ArrowClockwise, TextB, TextItalic, TextStrikethrough, Code, ListBullets, ListNumbers, CheckSquare, Link, Image, Table, CodeBlock, Sigma, Quotes, Minus} from "@phosphor-icons/react";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

async function uploadImage(file:File){const form=new FormData();form.append("file",file);const response=await fetch("/api/v1/assets",{method:"POST",body:form}),body=await response.json();if(!response.ok)throw new Error(body.error?.message||"Image upload failed");const asset=body.assets?.[0];if(!asset?.id)throw new Error("Image upload returned no asset");return `/api/v1/assets/${asset.id}`}

const tools = [
  {label:"Undo typing",icon:ArrowCounterClockwise,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(undoCommand.key)},
  {label:"Redo typing",icon:ArrowClockwise,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(redoCommand.key)},
  {label:"Bold",icon:TextB,mark:"strong",run:(ctx:Ctx)=>ctx.get(commandsCtx).call(toggleStrongCommand.key)},
  {label:"Italic",icon:TextItalic,mark:"emphasis",run:(ctx:Ctx)=>ctx.get(commandsCtx).call(toggleEmphasisCommand.key)},
  {label:"Strikethrough",icon:TextStrikethrough,mark:"strike_through",run:(ctx:Ctx)=>ctx.get(commandsCtx).call(toggleStrikethroughCommand.key)},
  {label:"Inline code",icon:Code,mark:"inlineCode",run:(ctx:Ctx)=>ctx.get(commandsCtx).call(toggleInlineCodeCommand.key)},
  {label:"Bulleted list",icon:ListBullets,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(wrapInBlockTypeCommand.key,{nodeType:bulletListSchema.type(ctx)})},
  {label:"Numbered list",icon:ListNumbers,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(wrapInBlockTypeCommand.key,{nodeType:orderedListSchema.type(ctx)})},
  {label:"Task list",icon:CheckSquare,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(wrapInBlockTypeCommand.key,{nodeType:listItemSchema.type(ctx),attrs:{checked:false}})},
  {label:"Link",icon:Link,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(toggleLinkCommand.key)},
  {label:"Image",icon:Image,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(addBlockTypeCommand.key,{nodeType:imageBlockSchema.type(ctx)})},
  {label:"Table",icon:Table,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(addBlockTypeCommand.key,{nodeType:createTable(ctx,3,3)})},
  {label:"Code block",icon:CodeBlock,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(setBlockTypeCommand.key,{nodeType:codeBlockSchema.type(ctx)})},
  {label:"Equation",icon:Sigma,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(addBlockTypeCommand.key,{nodeType:codeBlockSchema.type(ctx),attrs:{language:"LaTeX"}})},
  {label:"Quote",icon:Quotes,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(wrapInBlockTypeCommand.key,{nodeType:blockquoteSchema.type(ctx)})},
  {label:"Horizontal rule",icon:Minus,run:(ctx:Ctx)=>ctx.get(commandsCtx).call(addBlockTypeCommand.key,{nodeType:hrSchema.type(ctx)})}
];

export function LiveMarkdownEditor({value, onChange, onBlur, readOnly = false}: {value: string; onChange: (value: string) => void; onBlur: () => void; readOnly?: boolean}) {
  const root = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const latest = useRef(value);
  const change = useRef(onChange), blur = useRef(onBlur), readonlyRef = useRef(readOnly);
  const crepe = useRef<Crepe | null>(null);
  const [host,setHost] = useState<Element|null>(null);
  const [ready,setReady] = useState(false),[error,setError] = useState("");
  const [format,setFormat] = useState<{heading:number;marks:string[]}>({heading:0,marks:[]});
  change.current = onChange; blur.current = onBlur; readonlyRef.current = readOnly;

  function updateFormat(ctx:Ctx){
    if(!crepe.current)return;
    const {selection,storedMarks}=ctx.get(editorViewCtx).state;
    setFormat({heading:selection.$from.parent.type.name==="heading"?selection.$from.parent.attrs.level:0,marks:(storedMarks||selection.$from.marks()).map(mark=>mark.type.name)});
  }
  function activateToolbar() {
    const topBar=topBarRef.current;
    if(!topBar||!host)return;
    host.querySelectorAll<HTMLElement>(".milkdown-top-bar").forEach(item=>{item.hidden=item!==topBar});
  }
  function run(action:(ctx:Ctx)=>unknown){
    if(readOnly||!crepe.current)return;
    crepe.current.editor.action(ctx=>{action(ctx);ctx.get(editorViewCtx).focus();updateFormat(ctx)});
  }

  useEffect(() => {
    if (!root.current) return;
    setHost(root.current.closest(".integrated-note-editor")?.querySelector(".note-formatting-slot")||null);
    const editor = new Crepe({root:root.current,defaultValue:latest.current,features:{[Crepe.Feature.TopBar]:false},featureConfigs:{[Crepe.Feature.ImageBlock]:{onUpload: uploadImage}}});
    editor.on(listener => {
      listener.markdownUpdated((ctx, markdown) => {latest.current=markdown;change.current(markdown);updateFormat(ctx)});
      listener.selectionUpdated(ctx=>updateFormat(ctx));
      listener.blur(() => blur.current());
    });
    let disposed=false;
    void editor.create().then(() => {
      if(disposed){void editor.destroy();return}
      crepe.current=editor;
      root.current?.querySelector(".ProseMirror")?.setAttribute("aria-label","Note body");
      editor.setReadonly(readonlyRef.current);
      setReady(true);
    }).catch(reason=>{if(!disposed)setError(reason.message||"Could not load the editor")});
    return()=>{disposed=true;crepe.current=null;void editor.destroy()};
  }, []);

  useEffect(()=>{crepe.current?.setReadonly(readOnly)},[readOnly]);
  useEffect(()=>{
    if(!crepe.current||latest.current===value)return;
    latest.current=value;
    crepe.current.editor.action(replaceAll(value));
  },[value]);
  useEffect(()=>{
    if(!host||!topBarRef.current)return;
    const other=[...host.querySelectorAll<HTMLElement>(".milkdown-top-bar:not([hidden])")].find(item=>item!==topBarRef.current);
    topBarRef.current.hidden=!!other;
  },[host,readOnly]);

  return <>
    {host&&createPortal(<div className="milkdown-top-bar react-note-toolbar" ref={topBarRef} role="toolbar" aria-label="Text formatting" hidden={readOnly}>
      <label className="text-style-select"><span className="sr-only">Text style</span><select aria-label="Text style" value={format.heading} disabled={!ready} onChange={event=>run(ctx=>ctx.get(commandsCtx).call(setBlockTypeCommand.key,{nodeType:Number(event.target.value)?headingSchema.type(ctx):paragraphSchema.type(ctx),attrs:Number(event.target.value)?{level:Number(event.target.value)}:undefined}))}>
        <option value={0}>Paragraph</option>{[1,2,3,4,5,6].map(level=><option value={level} key={level}>Heading {level}</option>)}
      </select></label>
      <div className="top-bar-inner">{tools.map(({label,icon:Icon,run:action,mark})=><button key={label} type="button" className={`top-bar-item ${mark&&format.marks.includes(mark)?"active":""}`} title={label} aria-label={label} aria-pressed={mark?format.marks.includes(mark):undefined} disabled={!ready} onPointerDown={event=>event.preventDefault()} onClick={()=>run(action)}><Icon size={18}/></button>)}</div>
    </div>,host)}
    {error&&<div role="alert" className="tutor-error">{error}</div>}
    <div className="live-markdown-editor" ref={root} onFocusCapture={activateToolbar}/>
  </>;
}
