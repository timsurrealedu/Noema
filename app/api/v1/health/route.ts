import {healthReport} from "../../../../server/ops.mjs";
import {compilerCapabilities} from "../../../../server/compiler.mjs";
import {json} from "../../../../server/http.mjs";
import {loadConfig} from "../../../../server/config.mjs";

export const runtime="nodejs";
export function GET(){const health=healthReport(),config=loadConfig();return json({...health,codex:config.codexEnabled,geminiFallback:Boolean(config.geminiApiKey),openaiFallback:Boolean(config.openaiApiKey),compiler:{enabled:config.compilerEnabled,...compilerCapabilities()}},health.ok?200:503)}
