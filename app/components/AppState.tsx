"use client";

import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {showUnavailable} from "./ServiceNotice";

export type Task = {id:string; title:string; project:string; due:string; priority:"High"|"Medium"|"Low"; completed:boolean; recurrence?:string; subtasks?:string[]; archived?:boolean; version?:number};
export type Event = {id:string; title:string; day:number; time:string; top:number; height:number; location?:string; active?:boolean; version?:number};
export type Note = {id:string; title:string; excerpt:string; content:string; tags:string[]; time:string; ai:boolean; source?:string; favorite?:boolean; trashed?:boolean; version?:number};
export type CaptureSource = "typed"|"voice"|"file"|"link";
export type CaptureObject = {type:"task"|"event"|"note"; title:string; detail:string};
export type Capture = {
  id:string; text:string; createdAt:string; status:"processing"|"review"|"confirmed"|"failed"|"dismissed";
  source:CaptureSource; sourceLabel:string; progress?:number; error?:string; objects:CaptureObject[]; assets?:{id:string;name:string;mime:string;size:number}[]; version?:number;
};
export type Project = {id:string; name:string; status:"Active"|"Planned"|"Archived"; summary:string; version?:number};
export type TaskDependency = {taskId:string; dependsOnTaskId:string; createdAt:string};
export type NoteLink = {sourceNoteId:string; targetNoteId:string; linkText:string; createdAt:string};

type AppData = {tasks:Task[]; events:Event[]; notes:Note[]; captures:Capture[]; projects:Project[]; taskDependencies:TaskDependency[]; noteLinks:NoteLink[]};
type AppState = AppData & {
  addCapture:(text:string)=>string;
  addFileCapture:(file:File)=>string;
  updateCapture:(id:string,status:Capture["status"])=>void;
  confirmCapture:(id:string)=>void;
  requestInterpretation:(id:string)=>void;
  toggleTask:(id:string)=>void;
  saveTask:(task:Task)=>void;
  saveEvent:(event:Event)=>void;
  saveNote:(note:Note)=>void;
  trashNote:(id:string)=>void;
  archiveTask:(id:string)=>void;
};

const seed: AppData = {
  tasks:[
    {id:"proposal",title:"Review partnership proposal",project:"RevoU Partnership",due:"Today",priority:"High",completed:false},
    {id:"normalization",title:"Finish database normalization exercises",project:"Computer Science",due:"Today",priority:"Medium",completed:false},
    {id:"dian-questions",title:"Prepare questions for Dian",project:"RevoU Partnership",due:"Tomorrow",priority:"Medium",completed:false},
    {id:"tcp-cards",title:"Review TCP congestion control flashcards",project:"Computer Networks",due:"Friday",priority:"Low",completed:false},
  ],
  events:[
    {id:"study-block",day:0,top:76,height:58,title:"Study block",time:"09:00"},
    {id:"project-review",day:2,top:170,height:76,title:"Project review",time:"11:00"},
    {id:"networks",day:4,top:122,height:58,title:"Computer Networks lecture",time:"10:00",location:"Engineering Hall"},
    {id:"dian",day:4,top:264,height:76,title:"Meeting with Dian",time:"13:00",location:"Google Meet · Prep ready",active:true},
  ],
  notes:[
    {id:"tcp",title:"TCP Congestion Control",excerpt:"How TCP adapts its sending rate using slow start, congestion avoidance, and fast recovery.",content:"# TCP Congestion Control\n\nTCP adapts its sending rate using **slow start**, congestion avoidance, and fast recovery.\n\n## Source notes\n\n- Congestion window controls in-flight data\n- Packet loss signals congestion\n- AIMD stabilizes shared links",tags:["networking","tcp"],time:"12 min ago",ai:true,source:"Computer Networks lecture · July 24"},
    {id:"revou",title:"RevoU Partnership Notes",excerpt:"Meeting context, partnership scope, open questions, and proposal review notes.",content:"# RevoU Partnership Notes\n\n## Open questions\n\n- Confirm review timeline\n- Define success measures\n- Prepare stakeholder proposal",tags:["revou","partnership"],time:"Yesterday",ai:false,source:"Meeting capture · July 23"},
    {id:"database",title:"Database Normalization",excerpt:"Functional dependencies, normal forms, lossless decomposition, and worked examples.",content:"# Database Normalization\n\nNormalization reduces redundancy while preserving dependencies and lossless joins.",tags:["database","course"],time:"Yesterday",ai:false,source:"Imported PDF · database-week-4.pdf"},
    {id:"os-plan",title:"OS Exam Study Plan",excerpt:"Four-week review sequence covering processes, memory, file systems, and concurrency.",content:"# OS Exam Study Plan\n\n1. Processes and scheduling\n2. Memory management\n3. File systems\n4. Concurrency",tags:["operating-systems","study"],time:"Jul 22",ai:true,source:"Generated from course syllabus"},
  ],
  captures:[
    {id:"dentist",text:"Book dentist appointment next Tuesday morning",createdAt:"2026-07-24T09:41:00+07:00",status:"review",source:"voice",sourceLabel:"Voice · 18 sec",objects:[{type:"task",title:"Book dentist appointment",detail:"Due Tuesday · Personal"},{type:"event",title:"Dentist appointment",detail:"Tuesday · 9:00–9:30 AM"}]},
    {id:"aurora",text:"Project Aurora PRD v1.2.docx",createdAt:"2026-07-24T09:32:00+07:00",status:"confirmed",source:"file",sourceLabel:"Document · 2.4 MB",objects:[{type:"note",title:"Project Aurora requirements",detail:"12 sections · Source preserved"}]},
    {id:"linear-link",text:"https://linear.app/team/aurora/issue/1234",createdAt:"2026-07-24T09:21:00+07:00",status:"confirmed",source:"link",sourceLabel:"Web link · linear.app",objects:[{type:"task",title:"Review Aurora issue 1234",detail:"Project Aurora · No due date"}]},
    {id:"roadmap",text:"@Alex can you review the Q2 roadmap?",createdAt:"2026-07-24T08:58:00+07:00",status:"processing",source:"typed",sourceLabel:"Typed capture",progress:62,objects:[]},
    {id:"invoice",text:"Fwd: Invoice INV-001873",createdAt:"2026-07-24T08:15:00+07:00",status:"failed",source:"file",sourceLabel:"Email attachment · PDF",error:"The attachment could not be read. Try processing it again.",objects:[]},
    {id:"newsletter",text:"Ideas for the next newsletter",createdAt:"2026-07-23T19:16:00+07:00",status:"confirmed",source:"voice",sourceLabel:"Voice · 42 sec",objects:[{type:"note",title:"Newsletter ideas",detail:"6 ideas · Source preserved"}]},
  ],
  projects:[],
  taskDependencies:[],
  noteLinks:[],
};

const storageKey="lifeos-state-v2";
const queueKey="lifeos-offline-queue-v1";
const Context=createContext<AppState|null>(null);

type QueuedRequest={path:string;method:string;value:unknown;key:string};
const readQueue=():QueuedRequest[]=>{try{return JSON.parse(localStorage.getItem(queueKey)||"[]")}catch{return []}};
const writeQueue=(items:QueuedRequest[])=>localStorage.setItem(queueKey,JSON.stringify(items.slice(-100)));

async function api(path:string,method="GET",value?:unknown,key?:string){
  const response=await fetch(`/api/v1${path}`,{method,headers:value?{"Content-Type":"application/json","Idempotency-Key":key||crypto.randomUUID()}:undefined,body:value?JSON.stringify(value):undefined});
  if(!response.ok){const error=new Error((await response.json()).error?.message||"Backend request failed") as Error&{status?:number};error.status=response.status;throw error}
  return response.json();
}

async function flushQueue(){
  const items=readQueue();if(!items.length)return;
  const remaining:QueuedRequest[]=[];
  for(const item of items){try{await api(item.path,item.method,item.value,item.key)}catch(error){const status=(error as {status?:number}).status;if(!status||status>=500)remaining.push(item)}}
  writeQueue(remaining);
}

export function AppStateProvider({children}:{children:ReactNode}) {
  const [data,setData]=useState(seed);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    try {const saved=localStorage.getItem(storageKey);if(saved)setData({...seed,...JSON.parse(saved)})} catch {}
    api("/state").then(remote=>setData(current=>({...current,...remote,projects:remote.projects||[],taskDependencies:remote.taskDependencies||[],noteLinks:remote.noteLinks||[]}))).catch(()=>{});
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

  const persist=(path:string,method:string,value:unknown)=>{const key=crypto.randomUUID();void api(path,method,value,key).catch(error=>{if(!error.status||error.status>=500)writeQueue([...readQueue(),{path,method,value,key}]);showUnavailable(`${error.message} Your change remains saved in this browser and will retry when the server is reachable.`)});};
  const patchCapture=(id:string,patch:Partial<Capture>)=>setData(current=>({...current,captures:current.captures.map(item=>item.id===id?{...item,...patch}:item)}));
  const applyObjects=(created:{type:string;object:any}[])=>setData(current=>{
    const tasks=[...current.tasks],events=[...current.events],notes=[...current.notes];
    for(const {type,object} of created){
      if(type==="task")tasks.unshift({id:object.id,title:object.title,project:object.project,due:object.due,priority:object.priority,completed:!!object.completed,version:object.version});
      else if(type==="event")events.push({id:object.id,title:object.title,day:object.day,time:object.time,top:object.top,height:object.height,location:object.location??undefined,active:!!object.active,version:object.version});
      else notes.unshift({id:object.id,title:object.title,excerpt:object.excerpt,content:object.content,tags:object.tags_json?JSON.parse(object.tags_json):[],time:object.updated_at,ai:!!object.ai,version:object.version});
    }
    return {...current,tasks,events,notes};
  });
  const value:AppState={...data,
    addCapture:text=>{const capture={id:crypto.randomUUID(),text,createdAt:new Date().toISOString(),status:"review" as const,source:"typed" as const,sourceLabel:"Typed capture",objects:[],version:1};setData(current=>({...current,captures:[capture,...current.captures]}));persist("/captures","POST",capture);return capture.id},
    addFileCapture:file=>{const size=file.size>1024*1024?`${(file.size/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(file.size/1024))} KB`;const kind=file.type.startsWith("image/")?"Image":file.type.startsWith("audio/")?"Audio":file.type==="application/pdf"?"Document":"File";
      const capture={id:crypto.randomUUID(),text:file.name,createdAt:new Date().toISOString(),status:"review" as const,source:"file" as const,sourceLabel:`${kind} · ${size}`,objects:[],version:1};
      setData(current=>({...current,captures:[capture,...current.captures]}));
      const form=new FormData();form.append("file",file);
      fetch("/api/v1/assets",{method:"POST",body:form}).then(async response=>{if(!response.ok)throw new Error((await response.json()).error?.message||"Upload failed");return response.json()})
        .then(({assets})=>{patchCapture(capture.id,{assets:assets.map((asset:{id:string;name:string;mime:string;size:number})=>({id:asset.id,name:asset.name,mime:asset.mime,size:asset.size}))});persist("/captures","POST",{...capture,assetIds:assets.map((asset:{id:string})=>asset.id)})})
        .catch(error=>showUnavailable(`${error.message} The original file is not preserved on the server yet.`));
      return capture.id;
    },
    updateCapture:(id,status)=>{const capture=data.captures.find(item=>item.id===id);if(!capture)return;setData(current=>({...current,captures:current.captures.map(item=>item.id===id?{...item,status,version:(item.version||0)+1}:item)}));persist(`/captures/${id}`,"PATCH",{status,version:capture.version})},
    confirmCapture:id=>{const capture=data.captures.find(item=>item.id===id);if(!capture||capture.status==="confirmed")return;
      patchCapture(id,{status:"confirmed"});
      api(`/captures/${id}/apply`,"POST",{}).then(result=>applyObjects(result.created||[])).catch(error=>{
        showUnavailable(`${error.message} Interpreted objects were created in this browser only.`);
        applyObjects(capture.objects.map(object=>({type:object.type,object:object.type==="task"?{id:crypto.randomUUID(),title:object.title,project:"Inbox",due:"No date",priority:"Medium",completed:false,version:1}:object.type==="event"?{id:crypto.randomUUID(),title:object.title,day:new Date().getDay(),time:"09:00",top:0,height:58,location:undefined,active:false,version:1}:{id:crypto.randomUUID(),title:object.title,excerpt:object.detail.slice(0,140),content:object.detail||object.title,tags_json:"[]",updated_at:new Date().toISOString(),ai:true,version:1}})));
      });
    },
    requestInterpretation:id=>{const capture=data.captures.find(item=>item.id===id);if(!capture)return;
      patchCapture(id,{status:"processing",progress:10,error:undefined});
      api(`/captures/${id}/interpret`,"POST",{}).then(({jobId})=>{
        const source=new EventSource(`/api/v1/jobs/${jobId}/events`);
        const close=(patch:Partial<Capture>)=>{source.close();patchCapture(id,patch)};
        source.addEventListener("state",event=>{const info=JSON.parse((event as MessageEvent).data);
          if(info.state==="completed")api(`/jobs/${jobId}`).then(job=>close({status:"review",objects:job.result?.objects||capture.objects,progress:undefined})).catch(()=>close({status:"review",progress:undefined}));
          else if(info.state==="failed"||info.state==="cancelled"||info.state==="expired")close({status:"failed",error:"Processing failed on the server. Try again.",progress:undefined});
        });
        source.onerror=()=>close({status:"review",progress:undefined});
      }).catch(error=>{showUnavailable(`${error.message} Server interpretation is unavailable.`);patchCapture(id,{status:"review",progress:undefined})});
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
