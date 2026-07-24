import {saveNote,searchNotes} from "../../../../server/core.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(request:Request){try{requireUser(request);return json({notes:searchNotes(new URL(request.url).searchParams.get("q")||"")})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireUser(request);return json(saveNote(await body(request),undefined,user.id),201)}catch(error){return handle(error)}}
