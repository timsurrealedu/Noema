import {loadConfig} from "../../../../../server/config.mjs";
import {inspectPlugin} from "../../../../../server/plugins.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);const query=new URL(request.url).searchParams;return json(inspectPlugin(loadConfig().pluginCatalogs,query.get("catalogId"),query.get("pluginId"),query.get("version")))}catch(error){return handle(error)}}
