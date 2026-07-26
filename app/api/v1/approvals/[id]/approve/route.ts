import {approve} from "../../../../../../server/approvals.mjs";
import {handle,json,requireMfa} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params;return json(approve(id,user))}catch(error){return handle(error)}}
