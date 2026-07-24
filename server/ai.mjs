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

export async function runAI(args){
  if(!args.config.codexEnabled&&args.config.geminiApiKey)return runGemini(args);
  try{return {...await runCodex(args),provider:"codex"}}catch(error){if(!args.config.geminiApiKey||!isCapacityError(error))throw error;args.onEvent?.({type:"provider.fallback",provider:"gemini"});return runGemini(args)}
}
