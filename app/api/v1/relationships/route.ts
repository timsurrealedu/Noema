import {linkProject,unlinkProject} from "../../../../server/projects.mjs";
import {body,handle,json,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export async function POST(request:Request){try{const user=requireUser(request);return json(linkProject(await body(request),undefined,user.id),201)}catch(error){return handle(error)}}
export async function DELETE(request:Request){try{const user=requireUser(request),input=await body(request);return json(unlinkProject(input.projectId,input.objectType,input.objectId,undefined,user.id))}catch(error){return handle(error)}}
