import {getDatabase} from "../../../../../server/db.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request),{id}=await params,row=getDatabase().prepare("SELECT id,title,excerpt,content,tags_json,ai,draft,source,favorite,trashed,created_at,updated_at,version FROM notes WHERE id=? AND workspace_id=?").get(id,user.workspace.id) as any;if(!row)return json({error:{code:"NOT_FOUND",message:"Note not found",retryable:false}},404);return json({...row,tags:JSON.parse(row.tags_json),ai:!!row.ai,draft:!!row.draft,favorite:!!row.favorite,trashed:!!row.trashed,time:row.updated_at})}catch(error){return handle(error)}}
