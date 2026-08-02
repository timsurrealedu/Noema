"use client";

import {createId} from "../lib/id";

import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {showUnavailable} from "./ServiceNotice";
import {flushQueue, queueOfflineCapture, queueRequest} from "../lib/offlineQueue";

export type VaultTaskSource={sourceId:string;sourceName:string;relativePath:string;blockId:string;lineNumber:number;noteId:string};
export type Task = {id:string; title:string; project:string; due:string; priority:"High"|"Medium"|"Low"; completed:boolean; status?:"open"|"in_progress"|"blocked"|"completed"|"cancelled"; projectId?:string|null; courseId?:string|null; dueAt?:string|null; scheduledStartAt?:string|null; scheduledEndAt?:string|null; estimatedMinutes?:number|null; parentTaskId?:string|null; completedAt?:string|null; recurrence?:string; reminderAt?:string|null; subtasks?:string[]; archived?:boolean; vaultSource?:VaultTaskSource|null; version?:number};
export type Event = {id:string; title:string; day:number; time:string; top:number; height:number; location?:string; reminderAt?:string|null; active?:boolean; startAt?:string; endAt?:string; timezone?:string; allDay?:boolean; recurrence?:{frequency?:string;rules?:string[]}|null; googleCalendarId?:string; version?:number};
export type CalendarItem={kind:"event";event:Event}|{kind:"task";task:Task};
export type NoteBlockSummary={id:string;position:number;kind:"markdown"|"ink";version:number;width?:number;height?:number;transcript?:string;ocrStatus?:string};
export type Note = {id:string; title:string; excerpt:string; content:string; tags:string[]; time:string; ai:boolean; draft?:boolean; source?:string; sourceId?:string|null; relativePath?:string|null; syncState?:string; blocks?:NoteBlockSummary[]; favorite?:boolean; trashed?:boolean; version?:number};
export type CaptureSource = "typed"|"voice"|"file"|"link"|"handwriting";
export type CaptureObject = {id?:string; type:"task"|"event"|"note"|"vault"; title:string; detail:string; confidence?:number; sourceReferences?:string[]; arguments?:Record<string,unknown>};
export type Capture = {
  id:string; text:string; createdAt:string; status:"queued"|"processing"|"review"|"confirmed"|"failed"|"dismissed";
  source:CaptureSource; sourceLabel:string; progress?:number; error?:string; jobId?:string; objects:CaptureObject[]; assets?:{id:string;name:string;mime:string;size:number}[]; handwriting?:{noteId:string;inkBlockId:string;state:string;title:string;path:string;folder:string;action:"summary"|"expansion"|null;confidence:number|null;provider:string|null}|null; version?:number;
};
export type Project = {id:string; name:string; status:"Active"|"Planned"|"Archived"; summary:string; version?:number};
export type TaskDependency = {taskId:string; dependsOnTaskId:string; createdAt:string};
export type NoteLink = {sourceNoteId:string; targetNoteId:string; linkText:string; createdAt:string};

type AppData = {tasks:Task[]; events:Event[]; calendarItems:CalendarItem[]; notes:Note[]; captures:Capture[]; projects:Project[]; taskDependencies:TaskDependency[]; noteLinks:NoteLink[]};
type AppState = AppData & {
  addCapture:(text:string)=>string;
  addAndInterpretCapture:(text:string)=>string;
  addFileCapture:(file:File)=>string;
  updateCapture:(id:string,status:Capture["status"])=>void;
  confirmCapture:(id:string)=>void;
  cancelInterpretation:(id:string)=>void;
  requestInterpretation:(id:string)=>void;
  toggleTask:(id:string)=>void;
  saveTask:(task:Task)=>void;
  saveEvent:(event:Event)=>void;
  saveNote:(note:Note)=>void;
  trashNote:(id:string)=>void;
  archiveTask:(id:string)=>void;
};

const seed:AppData={tasks:[],events:[],calendarItems:[],notes:[],captures:[],projects:[],taskDependencies:[],noteLinks:[]};

const storageKey="noema-state-v3",staleStorageKeys=["noema-state-v2","lifeos-state-v2"];
const Context=createContext<AppState|null>(null);

async function api(path:string,method="GET",value?:unknown,key?:string){
  const response=await fetch(`/api/v1${path}`,{method,headers:value?{"Content-Type":"application/json","Idempotency-Key":key||createId()}:undefined,body:value?JSON.stringify(value):undefined});
  if(!response.ok){const error=new Error((await response.json()).error?.message||"Backend request failed") as Error&{status?:number};error.status=response.status;throw error}
  return response.json();
}
const proposalCards=(actions:any[]=[]):CaptureObject[]=>actions.map(action=>{const type=(action.type==="vault.note.create"?"vault":action.type.split(".")[0]) as CaptureObject["type"],args=action.arguments||{},detail=type==="event"?`${args.startAt} · ${args.timezone}`:type==="task"?args.dueAt||args.project||"No due date":String(args.content||"").slice(0,140);return {id:action.id,type,title:args.title,detail,confidence:action.confidence,sourceReferences:action.sourceReferences,arguments:args}});

export function AppStateProvider({children}:{children:ReactNode}) {
  const [data,setData]=useState(seed);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    try {for(const key of staleStorageKeys)localStorage.removeItem(key);const saved=localStorage.getItem(storageKey);if(saved)setData({...seed,...JSON.parse(saved)})} catch {}
    api("/state").then(remote=>setData(current=>({...current,...remote,projects:remote.projects||[],taskDependencies:remote.taskDependencies||[],noteLinks:remote.noteLinks||[]}))).catch(error=>{if(error.status===401&&!['/login','/join'].includes(location.pathname))location.assign("/login")});
    setLoaded(true);
  },[]);
  useEffect(()=>{if(loaded)localStorage.setItem(storageKey,JSON.stringify(data))},[data,loaded]);
  useEffect(()=>{
    void flushQueue();
    const online=()=>void flushQueue();
    window.addEventListener("online",online);
    const timer=setInterval(()=>void flushQueue(),30000);
    return()=>{window.removeEventListener("online",online);clearInterval(timer)};
  },[]);

  const persist=(path:string,method:string,value:unknown)=>{const idempotencyKey=createId();void api(path,method,value,idempotencyKey).catch(error=>{if(!error.status||error.status>=500)void queueRequest({path,method,body:value,idempotencyKey,dependencies:[]});showUnavailable(`${error.message} Your change remains saved in this browser and will retry when the server is reachable.`)});};
  const patchCapture=(id:string,patch:Partial<Capture>)=>setData(current=>({...current,captures:current.captures.map(item=>item.id===id?{...item,...patch}:item)}));
  const interpret=(capture:Capture)=>api(`/captures/${capture.id}/interpret`,"POST",{}).then(({jobId})=>{patchCapture(capture.id,{jobId});
    const source=new EventSource(`/api/v1/jobs/${jobId}/events`),close=(patch:Partial<Capture>)=>{source.close();patchCapture(capture.id,patch)};
    source.addEventListener("state",event=>{const info=JSON.parse((event as MessageEvent).data);
      if(info.state==="completed")api(`/jobs/${jobId}`).then(job=>close({status:"review",objects:proposalCards(job.result?.actions),version:job.result?.captureVersion,progress:undefined,jobId:undefined})).catch(()=>close({status:"failed",error:"The completed interpretation could not be loaded.",progress:undefined,jobId:undefined}));
      else if(info.state==="failed"||info.state==="cancelled"||info.state==="expired")close({status:"failed",error:info.state==="cancelled"?"Interpretation cancelled.":"Processing failed on the server. Try again.",progress:undefined,jobId:undefined});
    });
  }).catch(error=>{showUnavailable(`${error.message} Server interpretation is unavailable.`);patchCapture(capture.id,{status:"failed",error:error.message,progress:undefined})});
  const applyObjects=(created:{type:string;object:any}[])=>setData(current=>{
    const tasks=[...current.tasks],events=[...current.events],notes=[...current.notes];
    for(const {type,object} of created){
      if(type==="task")tasks.unshift({id:object.id,title:object.title,project:object.project,due:object.due,priority:object.priority,completed:!!object.completed,version:object.version});
      else if(type==="event")events.push({id:object.id,title:object.title,day:object.day,time:object.time,top:object.top,height:object.height,location:object.location??undefined,active:!!object.active,version:object.version});
      else notes.unshift({id:object.id,title:object.title,excerpt:object.excerpt,content:object.content,tags:object.tags_json?JSON.parse(object.tags_json):[],time:object.updated_at,ai:!!object.ai,version:object.version});
    }
    return {...current,tasks,events,notes};
  });
  const calendarItems:CalendarItem[]=[...data.events.map(event=>({kind:"event" as const,event})),...data.tasks.filter(task=>!task.archived&&(task.dueAt||task.scheduledStartAt)).map(task=>({kind:"task" as const,task}))];
  const value:AppState={...data,calendarItems,
    addCapture:text=>{const capture={id:createId(),text,createdAt:new Date().toISOString(),status:"review" as const,source:"typed" as const,sourceLabel:"Typed capture",objects:[],version:1};setData(current=>({...current,captures:[capture,...current.captures]}));persist("/captures","POST",capture);return capture.id},
    addAndInterpretCapture:text=>{const capture={id:createId(),text,createdAt:new Date().toISOString(),status:"processing" as const,source:"typed" as const,sourceLabel:"Typed capture",objects:[],progress:10,version:1};setData(current=>({...current,captures:[capture,...current.captures]}));api("/captures","POST",capture).then(()=>interpret(capture)).catch(error=>{showUnavailable(`${error.message} The capture remains saved in this browser.`);patchCapture(capture.id,{status:"failed",error:error.message,progress:undefined})});return capture.id},
    addFileCapture:file=>{const size=file.size>1024*1024?`${(file.size/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(file.size/1024))} KB`;const kind=file.type.startsWith("image/")?"Image":file.type.startsWith("audio/")?"Audio":file.type==="application/pdf"?"Document":"File";
      const capture={id:createId(),text:file.name,createdAt:new Date().toISOString(),status:"review" as const,source:"file" as const,sourceLabel:`${kind} · ${size}`,objects:[],version:1};
      setData(current=>({...current,captures:[capture,...current.captures]}));
      const form=new FormData();form.append("file",file);
      fetch("/api/v1/assets",{method:"POST",body:form}).then(async response=>{if(!response.ok)throw new Error((await response.json()).error?.message||"Upload failed");return response.json()})
        .then(({assets})=>{patchCapture(capture.id,{assets:assets.map((asset:{id:string;name:string;mime:string;size:number})=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size}))});persist("/captures","POST",{...capture,assetIds:assets.map((asset:{id:string})=>asset.id)})})
        .catch(error=>{void queueOfflineCapture(capture,file);showUnavailable(`${error.message} The original file is preserved on this device and will retry when the server is reachable.`)});
      return capture.id;
    },
    updateCapture:(id,status)=>{const capture=data.captures.find(item=>item.id===id);if(!capture)return;setData(current=>({...current,captures:current.captures.map(item=>item.id===id?{...item,status,version:(item.version||0)+1}:item)}));persist(`/captures/${id}`,"PATCH",{status,version:capture.version})},
    confirmCapture:id=>{const capture=data.captures.find(item=>item.id===id);if(!capture||capture.status==="confirmed")return;
      patchCapture(id,{status:"confirmed"});
      api(`/captures/${id}/apply`,"POST",{}).then(result=>applyObjects(result.created||[])).catch(error=>{
        showUnavailable(`${error.message} Interpreted objects were created in this browser only.`);
        applyObjects(capture.objects.map(object=>({type:object.type,object:object.type==="task"?{id:createId(),title:object.title,project:"Inbox",due:"No date",priority:"Medium",completed:false,version:1}:object.type==="event"?{id:createId(),title:object.title,day:new Date().getDay(),time:"09:00",top:0,height:58,location:undefined,active:false,version:1}:{id:createId(),title:object.title,excerpt:object.detail.slice(0,140),content:object.detail||object.title,tags_json:"[]",updated_at:new Date().toISOString(),ai:true,version:1}})));
      });
    },
    cancelInterpretation:id=>{const capture=data.captures.find(item=>item.id===id);if(!capture?.jobId)return;void api(`/jobs/${capture.jobId}/cancel`,"POST",{}).catch(error=>showUnavailable(error.message))},
    requestInterpretation:id=>{const capture=data.captures.find(item=>item.id===id);if(!capture)return;
      patchCapture(id,{status:"processing",progress:10,error:undefined});
      void interpret(capture);
    },
    toggleTask:id=>{const task=data.tasks.find(item=>item.id===id);if(!task)return;const changed={...task,completed:!task.completed};setData(current=>({...current,tasks:current.tasks.map(item=>item.id===id?{...changed,version:(task.version||0)+1}:item)}));persist("/tasks","POST",changed)},
    saveTask:task=>{const stored={...task,version:task.version?task.version+1:1};setData(current=>({...current,tasks:current.tasks.some(item=>item.id===task.id)?current.tasks.map(item=>item.id===task.id?stored:item):[stored,...current.tasks]}));persist("/tasks","POST",task)},
    saveEvent:event=>{const stored={...event,version:event.version?event.version+1:1};setData(current=>({...current,events:current.events.some(item=>item.id===event.id)?current.events.map(item=>item.id===event.id?stored:item):[...current.events,stored]}));persist("/events","POST",event)},
    saveNote:note=>{const stored={...note,version:note.version?note.version+1:1};setData(current=>({...current,notes:current.notes.some(item=>item.id===note.id)?current.notes.map(item=>item.id===note.id?stored:item):[stored,...current.notes]}));persist("/notes","POST",note)},
    trashNote:id=>{const note=data.notes.find(item=>item.id===id);if(!note)return;const changed={...note,trashed:true};setData(current=>({...current,notes:current.notes.map(item=>item.id===id?{...changed,version:(note.version||0)+1}:item)}));persist("/notes","POST",changed)},
    archiveTask:id=>{const task=data.tasks.find(item=>item.id===id);if(!task)return;const changed={...task,archived:true};setData(current=>({...current,tasks:current.tasks.map(item=>item.id===id?{...changed,version:(task.version||0)+1}:item)}));persist("/tasks","POST",changed)},
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(){const value=useContext(Context);if(!value)throw new Error("useAppState must be used inside AppStateProvider");return value}
