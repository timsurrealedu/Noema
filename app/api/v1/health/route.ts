import {healthReport} from "../../../../server/ops.mjs";
import {json} from "../../../../server/http.mjs";

export const runtime="nodejs";
export function GET(){const health=healthReport();return json({...health,codex:process.env.LIFEOS_CODEX_ENABLED==="true",geminiFallback:Boolean(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY),openaiFallback:Boolean(process.env.OPENAI_API_KEY),compiler:process.env.LIFEOS_COMPILER_ENABLED==="true"},health.ok?200:503)}
