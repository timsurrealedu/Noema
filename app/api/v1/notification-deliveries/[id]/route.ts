import {resolveDelivery,retryDelivery} from "../../../../../server/push.mjs";
import {body,handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{requireUser(request);const input=await body(request),id=(await params).id;return json(input.action==="retry"?retryDelivery(id):input.action==="resolve"?resolveDelivery(id):(()=>{throw new Error("Action must be retry or resolve")})())}catch(error){return handle(error)}}
