import {dashboardView,deleteDashboard,duplicateDashboard} from "../../../../../server/dashboards.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request);return json(dashboardView(user.id,(await params).id))}catch(error){return handle(error)}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request);return json(duplicateDashboard(user.id,(await params).id),201)}catch(error){return handle(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=requireUser(request),id=(await params).id,version=new URL(request.url).searchParams.get("version");return json(deleteDashboard(user.id,id,version))}catch(error){return handle(error)}}
