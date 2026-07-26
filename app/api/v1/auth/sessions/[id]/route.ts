import {revokeSessionById} from "../../../../../../server/auth.mjs";
import {handle,json,requireMfa} from "../../../../../../server/http.mjs";

export const runtime="nodejs";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireMfa(request),{id}=await params;return revokeSessionById(id,user.id)?json({ok:true}):json({error:{code:"NOT_FOUND",message:"Session not found or already revoked.",retryable:false}},404)}catch(error){return handle(error)}}
