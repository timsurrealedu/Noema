import {browseRepository,saveFiles} from "../../../../../server/repositories.mjs";
import {consumeApproval} from "../../../../../server/approvals.mjs";
import {body,handle,json,requireMfa,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),{id}=await params,path=new URL(request.url).searchParams.get("path")||"";return json(browseRepository(user.id,id,path))}catch(error){return handle(error)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params,input=await body(request),action={repositoryId:id,changes:input.changes};consumeApproval(input.approvalId,user,"repository.edit",action);return json(saveFiles(user.id,id,input.changes))}catch(error){return handle(error)}}
