// Scheduling determinism eval (F5.1): runs ten phrasings of the same intent
// through the capture interpreter and asserts dual task+event proposals.
// Requires a configured AI provider (GEMINI_API_KEY or similar); otherwise
// exits with a skip notice so CI stays green without keys.
import {resolve} from "node:path";
import {ensureDataDirs,loadConfig} from "../server/config.mjs";
import {captureProposalInstructions,validateProposal} from "../server/worker/handlers/interpret-capture.mjs";
import {runAI} from "../server/ai.mjs";

const phrasings=[
  "meeting tomorrow 1pm",
  "remind me to call the dentist and put it on my calendar friday 10am",
  "assignment 3 due next monday",
  "study group thursday 4pm in the library",
  "pay rent on the 1st",
  "coffee with Sam at 9 tomorrow morning",
  "submit lab report by wednesday 23:59",
  "doctor appointment next tuesday 15:30",
  "project sync every needs a task — meet the team monday 2pm",
  "japans exam on may 3rd, schedule prep session night before"
];

const schema={type:"object",additionalProperties:false,required:["summary","actions","clarifications"],properties:{summary:{type:"string"},actions:{type:"array",items:{type:"object"}},clarifications:{type:"array",items:{type:"string"}}}};

const isTimed=value=>/T\d{2}:\d{2}/.test(String(value||""));
const config=ensureDataDirs(loadConfig());
if(!config.geminiApiKey&&!config.groqApiKey&&!config.openaiApiKey){console.log("[eval-scheduling] no AI provider configured — skipping");process.exit(0)}

let pass=0,fail=0;
for(const [index,text] of phrasings.entries()){
  const prompt=`Interpret this Noema capture into proposed actions. Current time: ${new Date().toISOString()}\nTime zone: ${config.timezone||"UTC"}\n\n${captureProposalInstructions()}\n\nCapture:\n${text}`;
  try{
    const output=await runAI({prompt,cwd:resolve(config.jobsDir,`eval-${index}`),schema,config,profile:"fast"});
    const actions=output.result.actions||[],types=new Set(actions.map(action=>action.type));
    const dual=types.has("task.create")&&types.has("event.create");
    const timedAction=actions.find(action=>isTimed(action.arguments?.dueAt));
    const timedTaskNeedsEvent=types.has("task.create")&&timedAction&&!types.has("event.create");
    if(dual&&!timedTaskNeedsEvent)pass++;
    else{fail++;console.error(`[eval-scheduling] phrasing ${index+1} produced [${[...types].join(", ")}]: "${text}"`)}
  }catch(error){fail++;console.error(`[eval-scheduling] phrasing ${index+1} failed: ${error.message}`)}
}
console.log(`[eval-scheduling] dual-create on ${pass}/${phrasings.length} phrasings`);
process.exit(fail?1:0);
