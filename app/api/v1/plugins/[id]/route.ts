import {ensureDataDirs,loadConfig} from "../../../../../server/config.mjs";
import {consumeApproval} from "../../../../../server/approvals.mjs";
import {setPluginEnabled,uninstallPlugin} from "../../../../../server/plugins.mjs";
import {body,handle,json,requireMfa} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params,input=await body(request),action={pluginId:id,enabled:!!input.enabled};consumeApproval(input.approvalId,user,"plugin.enable",action);return json(setPluginEnabled(user.id,id,input.enabled))}catch(error){return handle(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params,input=await body(request),action={pluginId:id};consumeApproval(input.approvalId,user,"plugin.uninstall",action);return json(uninstallPlugin(user.id,id,ensureDataDirs(loadConfig()).pluginsDir))}catch(error){return handle(error)}}
