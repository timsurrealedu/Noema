import {deleteAutomation} from "../../../../../server/modules.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const version=Number(new URL(request.url).searchParams.get("version"));return json(deleteAutomation((await params).id,version))}catch(error){return handle(error)}}
