import {ensureDataDirs,loadConfig} from "../../../../../../server/config.mjs";
import {readCodeFile,saveCodeFile} from "../../../../../../server/codefiles.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireWorkspace(request);const path=new URL(request.url).searchParams.get("path");return json(readCodeFile(ensureDataDirs(loadConfig()).savedCodeDir,path))}catch(error){return handle(error)}}
export async function PUT(request:Request){try{requireWorkspace(request,"editor");const input=await body(request);return json(saveCodeFile(ensureDataDirs(loadConfig()).savedCodeDir,input.path,input.content))}catch(error){return handle(error)}}
