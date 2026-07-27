import {createWorkspace,listWorkspaces} from "../../../../server/collaboration.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireUser(request);return json({workspaces:listWorkspaces(user.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request),input=await body(request);return json(createWorkspace(user.id,input),201)}catch(error){return handle(error)}}
