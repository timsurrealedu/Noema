import {addJobEvent,assertNotCancelled} from "../jobs.mjs";

export const aiEventHandler=(jobId,db)=>event=>{
  assertNotCancelled(jobId,db);
  addJobEvent(jobId,"ai",{type:event.type,provider:event.provider},db);
};
