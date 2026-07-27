import {loadConfig} from "../../../../server/config.mjs";
import {listRepositories,registerRepository} from "../../../../server/repositories.mjs";
import {body,handle,json,requireMfa,requireUser} from "../../../../server/http.mjs";
export const runtime="nodejs";
export function GET(request:Request){try{const user=requireUser(request);return json({repositories:listRepositories(user.id)})}catch(error){return handle(error)}}
export async function POST(request:Request){try{const user=requireMfa(request),input=await body(request);return json(registerRepository(user.id,input,loadConfig().repositoryRoots),201)}catch(error){return handle(error)}}
