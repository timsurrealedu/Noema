import {workspaceCookie,handle,json,requireWorkspace} from "../../../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params,headers=new Headers(request.headers);headers.set("x-noema-workspace",id);const context=requireWorkspace(new Request(request.url,{headers}));return json({workspace:context.workspace},200,{"Set-Cookie":`${workspaceCookie}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`})}catch(error){return handle(error)}}
