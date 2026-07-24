import {getDatabase} from "../../../../server/db.mjs";
import {json} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(){const db=getDatabase();return json({ok:true,database:db.prepare("PRAGMA quick_check").get().quick_check,codex:process.env.LIFEOS_CODEX_ENABLED==="true",geminiFallback:Boolean(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY),compiler:process.env.LIFEOS_COMPILER_ENABLED==="true"})}
