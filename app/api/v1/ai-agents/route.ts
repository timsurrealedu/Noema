import {deleteAIAgent,listAIAgents,saveAIAgent} from "../../../../server/ai-agents.mjs";
import {loadConfig} from "../../../../server/config.mjs";
import {body,handle,json,requireMfa,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireUser(request);return json({agents:listAIAgents(user.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireMfa(request),input=await body(request);return json(saveAIAgent(user.id,input,loadConfig().appEncryptionKey),201)}catch(error){return handle(error)}}
export async function DELETE(request:Request){try{const user=requireMfa(request),input=await body(request);deleteAIAgent(user.id,String(input.id||""));return json({ok:true})}catch(error){return handle(error)}}
