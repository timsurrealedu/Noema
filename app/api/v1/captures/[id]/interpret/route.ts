import {enqueueJob} from "../../../../../../server/jobs.mjs";
import {handle,json,requireUser} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const {id}=await params;return json({jobId:enqueueJob("interpret-capture",{captureId:id})},202)}catch(error){return handle(error)}}
