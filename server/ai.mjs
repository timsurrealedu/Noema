import {runCodex} from "./codex.mjs";

const capacity=/usage limit|rate.?limit|limit reached|session limit|quota|resource_exhausted|insufficient credits|out of (tokens|credit)|\b429\b/i;
const schemaKeys=new Set(["type","format","title","description","enum","items","prefixItems","minItems","maxItems","minimum","maximum","anyOf","oneOf","properties","additionalProperties","required"]);

export const isCapacityError=error=>capacity.test(String(error?.message||error));
export function geminiSchema(value){
  if(Array.isArray(value))return value.map(geminiSchema);if(!value||typeof value!=="object")return value;
  return Object.fromEntries(Object.entries(value).filter(([key])=>schemaKeys.has(key)).map(([key,item])=>[key,key==="properties"?Object.fromEntries(Object.entries(item).map(([name,property])=>[name,geminiSchema(property)])):geminiSchema(item)]));
}

export async function runGemini({prompt,schema,config,fetcher=fetch}){
  if(!config.geminiApiKey)throw new Error("Gemini fallback is not configured");
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`,response=await fetcher(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":config.geminiApiKey},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseSchema:geminiSchema(schema)}})});
  if(!response.ok){const detail=(await response.text()).slice(0,300);throw new Error(`Gemini failed (HTTP ${response.status})${detail?`: ${detail}`:""}`)}
  const body=await response.json(),text=body.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("").trim();if(!text)throw new Error("Gemini returned no structured result");
  try{return {code:0,result:JSON.parse(text.replace(/^```json\s*|\s*```$/g,"")),provider:"gemini"}}catch{throw new Error("Gemini returned invalid structured output")}
}

export function selectOpenAIModel(workload,config){
  if(["simple","task","schedule"].includes(workload))return {model:config.openaiFastModel,reasoningEffort:null};
  return {model:config.openaiReasoningModel,reasoningEffort:["math","handwritten-math","research"].includes(workload)?"medium":"low"};
}

export async function runOpenAI({prompt,schema,workload="note",config,fetcher=fetch}){
  if(!config.openaiApiKey)throw new Error("OpenAI fallback is not configured");
  const {model,reasoningEffort}=selectOpenAIModel(workload,config),body={model,input:prompt,store:false,text:{format:{type:"json_schema",name:"lifeos_result",strict:true,schema}}};
  if(reasoningEffort)body.reasoning={effort:reasoningEffort};
  const response=await fetcher("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${config.openaiApiKey}`},body:JSON.stringify(body)});
  if(!response.ok){const detail=(await response.text()).slice(0,300);throw new Error(`OpenAI failed (HTTP ${response.status})${detail?`: ${detail}`:""}`)}
  const result=await response.json(),text=result.output_text||result.output?.flatMap(item=>item.content||[]).map(item=>item.text||"").join("").trim();if(!text)throw new Error("OpenAI returned no structured result");
  try{return {code:0,result:JSON.parse(text),provider:"openai",model,reasoningEffort}}catch{throw new Error("OpenAI returned invalid structured output")}
}

async function runFallback(args,originalError){
  if(args.config.geminiApiKey)try{args.onEvent?.({type:"provider.fallback",provider:"gemini"});return await runGemini(args)}catch(error){if(!args.config.openaiApiKey||!isCapacityError(error))throw error}
  if(args.config.openaiApiKey){args.onEvent?.({type:"provider.fallback",provider:"openai"});return runOpenAI(args)}
  throw originalError;
}

export async function runAI(args){
  if(!args.config.codexEnabled)return runFallback(args,new Error("No AI provider is configured"));
  try{return {...await runCodex(args),provider:"codex"}}catch(error){if(!isCapacityError(error))throw error;return runFallback(args,error)}
}
