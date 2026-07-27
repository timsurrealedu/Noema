import {consumeApproval} from "../../../../../../server/approvals.mjs";
import {runRepositoryCommand} from "../../../../../../server/repositories.mjs";
import {body,handle,json,requireMfa} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params,input=await body(request),action={repositoryId:id,commandId:input.commandId};consumeApproval(input.approvalId,user,"repository.command",action);return json(await runRepositoryCommand(user.id,id,input.commandId))}catch(error){return handle(error)}}
