import {createNotification,listNotifications} from "../../../../server/modules.mjs";
import {body,handle,json,requireWorkspace} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireWorkspace(request);return json({notifications:listNotifications(undefined,user.workspace.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireWorkspace(request,"editor");return json(createNotification(await body(request),undefined,user.workspace.id),201)}catch(error){return handle(error)}}
