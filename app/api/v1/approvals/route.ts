import {createApproval,listApprovals} from "../../../../server/approvals.mjs";
import {body,handle,json,requireMfa,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request){try{const user=requireUser(request);return json({approvals:listApprovals(user.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireMfa(request),input=await body(request);return json(createApproval(user,input),201)}catch(error){return handle(error)}}
