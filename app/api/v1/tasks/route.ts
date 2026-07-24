import {saveTask} from "../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireUser(request);return json(saveTask(await body(request),undefined,user.id),201)}catch(error){return handle(error)}}
