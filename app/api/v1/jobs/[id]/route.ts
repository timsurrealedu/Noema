import {getJob} from "../../../../../server/jobs.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const {id}=await params,job=getJob(id);return job?json(job):json({error:{code:"NOT_FOUND",message:"Job not found",retryable:false}},404)}catch(error){return handle(error)}}
