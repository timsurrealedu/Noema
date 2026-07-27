import {dashboardView,deleteDashboard,duplicateDashboard} from "../../../../../server/dashboards.mjs";
import {handle,json,requireWorkspace} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request);return json(dashboardView(user.workspace.id,(await params).id))}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor");return json(duplicateDashboard(user.id,user.workspace.id,(await params).id),201)}catch(error){return handle(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireWorkspace(request,"editor"),id=(await params).id,version=new URL(request.url).searchParams.get("version");return json(deleteDashboard(user.workspace.id,id,version))}catch(error){return handle(error)}}
