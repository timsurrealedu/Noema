import {body,handle,json,requireWorkspace} from "../../../../server/http.mjs";
import {loadTutorSession,runTutor} from "../../../../server/skills.mjs";

export function GET(request:Request){try{const user=requireWorkspace(request),url=new URL(request.url),kind=url.searchParams.get("kind")==="code"?"code":"note",subjectId=url.searchParams.get("subjectId")||"";if(!subjectId)throw new Error("subjectId is required");return json(loadTutorSession(kind,subjectId,undefined,user.workspace.id))}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor"),input=await body(request);if(!String(input.question||"").trim())throw new Error("Question is required");return json(await runTutor(input,undefined,undefined,user.workspace.id))}catch(error){return handle(error)}}
