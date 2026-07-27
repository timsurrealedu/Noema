import {consumeApproval} from "../../../../../../server/approvals.mjs";
import {runPlugin} from "../../../../../../server/plugins.mjs";
import {body,handle,json,requireMfa} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params,input=await body(request),action={pluginId:id,input:input.input||{}};consumeApproval(input.approvalId,user,"plugin.run",action);return json(await runPlugin(user.id,id,input.input||{}))}catch(error){return handle(error)}}
