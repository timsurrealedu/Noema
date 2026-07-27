import {consumeApproval} from "../../../../../../server/approvals.mjs";
import {mutateGit,repositoryGit} from "../../../../../../server/repositories.mjs";
import {body,handle,json,requireMfa,requireUser} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params;return json(repositoryGit(user.id,id))}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params,input=await body(request),action=input.action==="commit"?{repositoryId:id,action:"commit",message:input.message,paths:input.paths}:{repositoryId:id,action:"revert",ref:input.ref};consumeApproval(input.approvalId,user,`repository.${input.action}`,action);return json(mutateGit(user.id,id,input))}catch(error){return handle(error)}}
