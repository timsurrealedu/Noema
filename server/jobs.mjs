import {randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";

const now=()=>new Date().toISOString();
export function enqueueJob(kind,input,db=getDatabase()){const id=randomUUID(),time=now();db.prepare("INSERT INTO jobs(id,kind,state,input_json,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id,kind,"queued",JSON.stringify(input),time,time);addJobEvent(id,"queued",{},db);return id}
export function addJobEvent(id,type,data,db=getDatabase()){db.prepare("INSERT INTO job_events(job_id,type,data_json,created_at) VALUES(?,?,?,?)").run(id,type,JSON.stringify(data),now())}
export function claimJob(kinds,leaseSeconds=60,db=getDatabase()){
  const placeholders=kinds.map(()=>"?").join(",");db.exec("BEGIN IMMEDIATE");
  try{
    for(;;){
      const time=now();
      const job=db.prepare(`SELECT * FROM jobs WHERE kind IN (${placeholders}) AND (state='queued' OR (state IN ('claimed','running') AND lease_until<?)) ORDER BY created_at LIMIT 1`).get(...kinds,time);
      if(!job){db.exec("COMMIT");return null}
      if(job.cancel_requested){db.prepare("UPDATE jobs SET state='cancelled',lease_until=NULL,updated_at=?,version=version+1 WHERE id=?").run(time,job.id);addJobEvent(job.id,"cancelled",{},db);continue}
      const lease=new Date(Date.now()+leaseSeconds*1000).toISOString(),reclaimed=job.state!=="queued";
      db.prepare("UPDATE jobs SET state='claimed',lease_until=?,updated_at=?,version=version+1 WHERE id=?").run(lease,time,job.id);addJobEvent(job.id,reclaimed?"reclaimed":"claimed",{leaseUntil:lease},db);db.exec("COMMIT");return {...job,state:"claimed",input:JSON.parse(job.input_json)};
    }
  }catch(error){db.exec("ROLLBACK");throw error}}
export function finishJob(id,result,db=getDatabase()){db.prepare("UPDATE jobs SET state='completed',result_json=?,lease_until=NULL,updated_at=?,version=version+1 WHERE id=?").run(JSON.stringify(result),now(),id);addJobEvent(id,"completed",result,db)}
export function failJob(id,error,db=getDatabase()){
  const job=db.prepare("SELECT attempts,max_attempts FROM jobs WHERE id=?").get(id),attempts=(job?.attempts||0)+1,max=job?.max_attempts||3,message=String(error).slice(0,4000);
  if(job&&attempts<max){db.prepare("UPDATE jobs SET state='queued',attempts=?,error=?,lease_until=NULL,updated_at=?,version=version+1 WHERE id=?").run(attempts,message,now(),id);addJobEvent(id,"retry-scheduled",{attempt:attempts,maxAttempts:max,message},db)}
  else{db.prepare("UPDATE jobs SET state='failed',attempts=?,error=?,lease_until=NULL,updated_at=?,version=version+1 WHERE id=?").run(attempts,message,now(),id);addJobEvent(id,"failed",{message},db)}
}
export function cancelJob(id,db=getDatabase()){const result=db.prepare("UPDATE jobs SET cancel_requested=1,updated_at=?,version=version+1 WHERE id=? AND state IN ('queued','claimed','running')").run(now(),id);if(result.changes)addJobEvent(id,"cancel-requested",{},db);return result.changes===1}
export function getJob(id,db=getDatabase()){const job=db.prepare("SELECT * FROM jobs WHERE id=?").get(id);if(!job)return null;return {...job,input:JSON.parse(job.input_json),result:job.result_json?JSON.parse(job.result_json):null,events:db.prepare("SELECT * FROM job_events WHERE job_id=? ORDER BY id").all(id).map(e=>({...e,data:JSON.parse(e.data_json)}))}}
