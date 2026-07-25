import {importMarkdown} from "../../../../../server/core.mjs";
import {handle,json,requireUser} from "../../../../../server/http.mjs";

export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireUser(request),markdown=await request.text();return json(importMarkdown(markdown,undefined,user.id),201)}catch(error){return handle(error)}}
