import {revokeInvitation} from "../../../../../../../server/collaboration.mjs";
import {handle,json,requireMfa} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;invitationId:string}>}){try{const user=requireMfa(request),{id,invitationId}=await params;return json(revokeInvitation(user.id,id,invitationId))}catch(error){return handle(error)}}
