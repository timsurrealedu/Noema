import {ensureDataDirs,loadConfig} from "../../../../server/config.mjs";
import {consumeApproval} from "../../../../server/approvals.mjs";
import {installPlugin,listPluginMarketplace} from "../../../../server/plugins.mjs";
import {body,handle,json,requireMfa,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireUser(request),config=loadConfig();return json(listPluginMarketplace(user.id,config.pluginCatalogs))}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireMfa(request),input=await body(request),action={catalogId:input.catalogId,pluginId:input.pluginId,version:input.version};consumeApproval(input.approvalId,user,"plugin.install",action);const config=ensureDataDirs(loadConfig());return json(installPlugin(user.id,input,config.pluginCatalogs,config.pluginsDir),201)}catch(error){return handle(error)}}
