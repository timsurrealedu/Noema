import {deletePushSubscription,savePushSubscription} from "../../../../server/modules.mjs";
import {loadConfig} from "../../../../server/config.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);const publicKey=loadConfig().vapidPublicKey;return json({configured:!!publicKey,publicKey})}catch(error){return handle(error)}}
export async function POST(request:Request){try{requireUser(request);return json(savePushSubscription(await body(request)),201)}catch(error){return handle(error)}}
export async function DELETE(request:Request){try{requireUser(request);return json(deletePushSubscription((await body(request)).endpoint))}catch(error){return handle(error)}}
