import {randomUUID} from "node:crypto";
import {resolve} from "node:path";
import {getDatabase} from "./db.mjs";
import {ensureDataDirs,loadConfig} from "./config.mjs";
import {runAI} from "./ai.mjs";

const common="Preserve the user's language. Be concise, concrete, and source-grounded. Never claim an action was performed when it was only proposed.";
const definitions={
  "process-inbox":{mode:"proposal",description:"Turn unprocessed captures into proposed tasks, events, or notes.",instructions:"Classify each capture. When uncertain, propose a note tagged needs-filing. Preserve source text."},
  research:{mode:"proposal",description:"Assess an idea and draft a structured research note.",instructions:"Assess demand, competition, feasibility, differentiation, and next steps. Return a sourced note proposal."},
  "weekly-review":{mode:"proposal",description:"Summarize the last week and propose next-week focuses.",instructions:"Summarize recent notes, open tasks, captures, and three realistic focuses."},
  "refresh-home":{mode:"proposal",description:"Propose a concise, link-rich Home note.",instructions:"Use only domains and notes present in the supplied context. Propose Home.md content."},
  assistant:{mode:"read",description:"Answer questions using LifeOS context.",instructions:"Act as a read-only personal assistant. Cite relevant note titles."},
  "note-tutor":{mode:"read",description:"Teach from one open note and related notes.",instructions:"Explain step by step. Use Markdown and LaTeX. Cite related notes only when useful."},
  "code-tutor":{mode:"read",description:"Explain and improve the open code buffer.",instructions:"Explain bugs and logic. Return an exact replacement only when a concrete edit helps."},
  "note-augment":{mode:"proposal",description:"Draft an additive study section for an open note.",instructions:"Draft a self-contained Markdown section with a heading, key ideas, LaTeX, and an example. Never remove existing content."},
  "semantic-search":{mode:"read",description:"Find notes by meaning rather than literal keywords.",instructions:"Return only genuinely relevant note citations, ranked by relevance."},
  autosort:{mode:"proposal",description:"Propose safe vault organization changes.",instructions:"Propose moves only. Never modify data. Exclude infrastructure and already-organized content."},
};

export const listSkills=()=>Object.entries(definitions).map(([id,value])=>({id,...value}));
export function getSkill(id){const skill=definitions[id];if(!skill)throw Object.assign(new Error("Unknown skill"),{status:404});return {id,...skill}}
export function buildSkillPrompt(id,input,context=""){const skill=getSkill(id);return `You are running the managed LifeOS skill \"${id}\".\n${skill.instructions}\n${common}\n\nLifeOS context:\n${context||"No additional context."}\n\nUser input:\n${JSON.stringify(input)}`}

const tutorSchema={type:"object",additionalProperties:false,required:["answer","citations","replacement"],properties:{answer:{type:"string",minLength:1,maxLength:12000},citations:{type:"array",maxItems:8,items:{type:"string",maxLength:500}},replacement:{type:"string",maxLength:50000}}};
export async function runTutor(input,config=ensureDataDirs(loadConfig()),db=getDatabase(config)){
  const kind=input.kind==="code"?"code-tutor":"note-tutor",messages=Array.isArray(input.messages)?input.messages.slice(-8):[];
  const subject=kind==="code-tutor"?`File: ${String(input.name||"Untitled").slice(0,300)}\nLanguage: ${String(input.language||"unknown").slice(0,50)}\nCode:\n${String(input.code||"").slice(0,50000)}`:`Note: ${String(input.title||"Untitled").slice(0,300)}\nContent:\n${String(input.content||"").slice(0,50000)}`;
  const related=kind==="note-tutor"?db.prepare("SELECT title,excerpt FROM notes WHERE trashed=0 AND id<>? ORDER BY updated_at DESC LIMIT 8").all(String(input.id||"")).map(note=>`- [[${note.title}]]: ${note.excerpt}`).join("\n"):"";
  const prompt=buildSkillPrompt(kind,{subject,messages,question:String(input.question||"").slice(0,4000)},related),output=await runAI({prompt,cwd:resolve(config.jobsDir,`tutor-${randomUUID()}`),schema:tutorSchema,config});return {...output.result,provider:output.provider};
}

export const skillSchema={type:"object",additionalProperties:false,required:["summary","proposals","citations"],properties:{summary:{type:"string",maxLength:4000},proposals:{type:"array",maxItems:30,items:{type:"object",additionalProperties:false,required:["type","title","content"],properties:{type:{enum:["note","task","event","move","answer"]},title:{type:"string",maxLength:500},content:{type:"string",maxLength:20000}}}},citations:{type:"array",maxItems:20,items:{type:"string",maxLength:500}}}};
