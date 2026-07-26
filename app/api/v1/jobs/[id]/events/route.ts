import {getDatabase} from "../../../../../../server/db.mjs";
import {requireUser} from "../../../../../../server/http.mjs";
import {getJob} from "../../../../../../server/jobs.mjs";

export const runtime="nodejs";

const terminal=new Set(["completed","failed","cancelled","expired"]);

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{requireUser(request)}catch{return new Response("Authentication required",{status:401})}
  const {id}=await params,db=getDatabase(),job=getJob(id,db);
  if(!job)return new Response("Job not found",{status:404});
  const encoder=new TextEncoder();
  let lastEventId=Math.max(0,Number(request.headers.get("last-event-id")||new URL(request.url).searchParams.get("lastEventId")||0)||0),closed=false,timer:ReturnType<typeof setInterval>,heartbeat:ReturnType<typeof setInterval>,limit:ReturnType<typeof setTimeout>;
  const stop=(controller:ReadableStreamDefaultController)=>{if(closed)return;closed=true;clearInterval(timer);clearInterval(heartbeat);clearTimeout(limit);try{controller.close()}catch{}};
  const stream=new ReadableStream({
    start(controller){
      const send=(event:string,data:unknown,id?:number)=>{if(!closed)try{controller.enqueue(encoder.encode(`${id?`id: ${id}\n`:""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))}catch{closed=true}};
      send("state",{id:job.id,kind:job.kind,state:job.state,cancelRequested:!!job.cancel_requested});
      const flush=()=>{
        if(closed)return;
        try{
          for(const row of db.prepare("SELECT * FROM job_events WHERE job_id=? AND id>? ORDER BY id").all(id,lastEventId) as {id:number;type:string;data_json:string;created_at:string}[]){lastEventId=row.id;send(row.type,{id:row.id,type:row.type,data:JSON.parse(row.data_json),createdAt:row.created_at},row.id)}
          const current=db.prepare("SELECT state,cancel_requested FROM jobs WHERE id=?").get(id) as {state:string;cancel_requested:number}|undefined;
          if(!current||terminal.has(current.state)){send("state",{id,state:current?.state||"expired",cancelRequested:!!current?.cancel_requested});stop(controller)}
        }catch{stop(controller)}
      };
      timer=setInterval(flush,1000);
      heartbeat=setInterval(()=>{if(!closed)try{controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`))}catch{closed=true}},15000);
      limit=setTimeout(()=>stop(controller),5*60_000);
      request.signal.addEventListener("abort",()=>stop(controller));
      flush();
    },
    cancel(){closed=true;clearInterval(timer);clearInterval(heartbeat);clearTimeout(limit)},
  });
  return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-store","Connection":"keep-alive"}});
}
