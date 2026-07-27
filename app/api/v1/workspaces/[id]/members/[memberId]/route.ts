import {changeMember} from "../../../../../../../server/collaboration.mjs";
import {body,handle,json,requireMfa} from "../../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;memberId:string}>}){try{const user=requireMfa(request),{id,memberId}=await params,input=await body(request);return json(changeMember(user.id,id,memberId,input))}catch(error){return handle(error)}}
