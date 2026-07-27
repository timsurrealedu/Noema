import {analyticsStatus,deleteAnalytics,recordAnalytics,setAnalyticsEnabled} from "../../../../server/analytics.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(request:Request){try{const user=requireUser(request);return json(analyticsStatus(user.id))}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request);return json(recordAnalytics(user.id,await body(request)),201)}catch(error){return handle(error)}}
export async function PATCH(request:Request){try{const user=requireUser(request),input=await body(request);return json(setAnalyticsEnabled(user.id,input.enabled))}catch(error){return handle(error)}}
export function DELETE(request:Request){try{const user=requireUser(request);return json(deleteAnalytics(user.id))}catch(error){return handle(error)}}
