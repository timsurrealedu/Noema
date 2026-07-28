import {createCapture} from "../../../../server/core.mjs";
import {body,handle,idempotent,json,requireWorkspace} from "../../../../server/http.mjs";
import {getDatabase} from "../../../../server/db.mjs";
import {enqueueJob} from "../../../../server/jobs.mjs";
import {getSettings} from "../../../../server/settings.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request),actor={id:user.id,workspaceId:user.workspace.id},db=getDatabase(),result=idempotent(request,`${user.id}:${user.workspace.id}`,input,()=>{const capture=createCapture(input,db,actor);if(capture.source==="file")return capture;const profile=getSettings(user.id,db).ai.profile,jobId=enqueueJob("interpret-capture",{captureId:capture.id,profile},db,user.workspace.id,{dedupeKey:`interpret-capture:${capture.id}`,profile,maxAttempts:2});return {...capture,status:"processing",jobId}});return json(result.value,result.replayed?200:201,result.replayed?{"Idempotency-Replayed":"true"}:{})}catch(error){return handle(error)}}
