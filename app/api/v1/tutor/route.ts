import {body,handle,json,requireUser} from "../../../../server/http.mjs";
import {runTutor} from "../../../../server/skills.mjs";

export async function POST(request:Request){try{requireUser(request);const input=await body(request);if(!String(input.question||"").trim())throw new Error("Question is required");return json(await runTutor(input))}catch(error){return handle(error)}}
