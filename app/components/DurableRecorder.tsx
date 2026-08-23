"use client";

import {useEffect,useRef,useState} from "react";
import {Microphone,Pause,Play,Trash,Stop,CircleNotch} from "@phosphor-icons/react";
import {deleteRecording,listUnfinishedRecordings,loadRecording,saveRecordingChunk} from "../lib/offlineQueue";

type Props={onFinished:(file:File)=>void;label?:string};

// Durable lecture recorder (S2/F4.1): chunks are persisted to IndexedDB every
// second so navigation or a tab crash never loses recorded audio. Reopening
// the app offers recovery of an unfinished recording.
export function DurableRecorder({onFinished,label="Record voice"}:Props){
  const [state,setState]=useState<"idle"|"recording"|"paused"|"processing">("idle");
  const [recoverable,setRecoverable]=useState<string|null>(null);
  const [seconds,setSeconds]=useState(0);
  const [error,setError]=useState("");
  const recorder=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const recordingId=useRef<string>("");
  const chunkIndex=useRef(0);
  const timer=useRef<ReturnType<typeof setInterval>|null>(null);
  const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":MediaRecorder.isTypeSupported("audio/webm")?"audio/webm":"audio/mp4";

  useEffect(()=>{
    listUnfinishedRecordings().then(ids=>{if(ids.length)setRecoverable(ids[0])}).catch(()=>{});
    return()=>{
      if(timer.current)clearInterval(timer.current);
      stream.current?.getTracks().forEach(track=>track.stop());
      recorder.current?.state==="recording"&&recorder.current.stop();
    };
  },[]);

  async function persist(event:BlobEvent){
    if(!event.data.size)return;
    await saveRecordingChunk(recordingId.current,chunkIndex.current++,event.data,event.data.type||mime);
  }

  async function begin(){
    setError("");
    try{
      recordingId.current=`rec-${Date.now()}`;
      chunkIndex.current=0;
      stream.current=await navigator.mediaDevices.getUserMedia({audio:true});
      const active=new MediaRecorder(stream.current,{mimeType:mime});
      active.ondataavailable=event=>void persist(event);
      active.start(1000);
      recorder.current=active;
      setState("recording");
      timer.current=setInterval(()=>setSeconds(value=>value+1),1000);
    }catch(reason){setError(reason instanceof Error?reason.message:"Microphone access failed")}
  }

  async function finalize(){
    if(timer.current)clearInterval(timer.current);
    const id=recordingId.current;
    const active=recorder.current;
    setState("processing");
    if(active&&active.state!=="inactive")await new Promise<void>(resolve=>{active.onstop=()=>resolve();active.stop()});
    stream.current?.getTracks().forEach(track=>track.stop());
    try{
      const chunks=await loadRecording(id);
      if(!chunks.length){setState("idle");return}
      const type=chunks[0].mime||mime;
      const file=new File(chunks.map(chunk=>chunk.blob),`lecture-${id}.webm`,{type});
      onFinished(file);
      await deleteRecording(id);
    }catch(reason){setError(reason instanceof Error?reason.message:"Could not save the recording")}
    recorder.current=null;
    setSeconds(0);
    setState("idle");
  }

  async function discard(id:string){
    await deleteRecording(id);
    setRecoverable(null);
  }

  return (
    <span className="durable-recorder" role="group" aria-label="Audio recorder">
      {recoverable&&state==="idle"&&(
        <span className="recorder-recover">
          <CircleNotch aria-hidden="true"/><span>Unfinished recording found</span>
          <button type="button" className="secondary" onClick={()=>void discard(recoverable)} aria-label="Discard unfinished recording"><Trash/>Discard</button>
        </span>
      )}
      {state==="idle"&&<button type="button" className="capture-tool capture-voice" aria-label={label} title={label} onClick={()=>void begin()}><Microphone/></button>}
      {(state==="recording"||state==="paused")&&<>
        <span className="recorder-time" role="timer">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</span>
        {state==="recording"
          ?<button type="button" className="capture-tool" aria-label="Pause recording" onClick={()=>{recorder.current?.pause();setState("paused")}}><Pause/></button>
          :<button type="button" className="capture-tool capture-recording" aria-label="Resume recording" onClick={()=>{recorder.current?.resume();setState("recording")}}><Play/></button>}
        <button type="button" className="capture-tool capture-stop primary" aria-label="Finish recording" onClick={()=>void finalize()}><Stop weight="fill"/></button>
      </>}
      {state==="processing"&&<button type="button" className="capture-tool" disabled aria-label="Saving recording"><CircleNotch className="spin"/></button>}
      {error&&<small role="alert">{error}</small>}
    </span>
  );
}
