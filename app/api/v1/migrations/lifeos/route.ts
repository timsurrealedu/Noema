import {lifeosMigrationInventory} from "../../../../../server/vault.mjs";
import {body,handle,json,requireWorkspace} from "../../../../../server/http.mjs";

export async function POST(request:Request){try{requireWorkspace(request,"editor");return json(lifeosMigrationInventory(await body(request)))}catch(error){return handle(error)}}
