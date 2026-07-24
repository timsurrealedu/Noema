import {handle,json,requireUser} from "../../../../server/http.mjs";
import {listSkills} from "../../../../server/skills.mjs";

export function GET(request:Request){try{requireUser(request);return json({skills:listSkills()})}catch(error){return handle(error)}}
