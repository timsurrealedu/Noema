import {ensureDataDirs,loadConfig} from "../../../../../server/config.mjs";
import {listCodeFiles} from "../../../../../server/codefiles.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireWorkspace(request);const config=ensureDataDirs(loadConfig());return json(listCodeFiles(config.savedCodeDir))}catch(error){return handle(error)}}
