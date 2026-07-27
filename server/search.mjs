import {getDatabase} from "./db.mjs";
import {loadConfig} from "./config.mjs";
import {searchAll} from "./core.mjs";

const types=["notes","tasks","events","projects","captures"];
const text={notes:row=>`${row.title}\n${row.excerpt}`,tasks:row=>`${row.title}\n${row.project}`,events:row=>`${row.title}\n${row.location||""}`,projects:row=>`${row.name}\n${row.summary}`,captures:row=>row.text};
const key=(type,row)=>`${type}:${row.id}`;
const cosine=(a,b)=>{let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2}return aa&&bb?dot/Math.sqrt(aa*bb):0};
const candidates=db=>({
  notes:db.prepare("SELECT id,title,excerpt,updated_at AS updatedAt FROM notes WHERE trashed=0 ORDER BY updated_at DESC LIMIT 50").all(),
  tasks:db.prepare("SELECT id,title,project,due,updated_at AS updatedAt FROM tasks WHERE archived=0 ORDER BY updated_at DESC LIMIT 50").all(),
  events:db.prepare("SELECT id,title,day,time,location,start_at AS startAt,end_at AS endAt,timezone,updated_at AS updatedAt FROM events WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 50").all(),
  projects:db.prepare("SELECT id,name,status,summary,updated_at AS updatedAt FROM projects ORDER BY updated_at DESC LIMIT 50").all(),
  captures:db.prepare("SELECT id,text,source,status,updated_at AS updatedAt FROM captures ORDER BY updated_at DESC LIMIT 50").all(),
});

export async function searchWorkspace(query,{semantic=false,db=getDatabase(),config=loadConfig(),fetcher=fetch}={}){
  const raw=searchAll(query,db),local={...raw,notes:raw.notes.map(row=>({id:row.id,title:row.title,excerpt:row.excerpt,updatedAt:row.updated_at}))},fallback={...local,ranking:{mode:"local",source:"SQLite FTS/LIKE"}};
  if(!semantic)return fallback;
  if(!config.openaiApiKey)return {...fallback,ranking:{...fallback.ranking,fallback:"Embeddings unavailable"}};
  const pool=candidates(db),byKey=new Map();
  for(const type of types)for(const row of [...local[type],...pool[type]])if(!byKey.has(key(type,row)))byKey.set(key(type,row),{type,row,input:text[type](row).slice(0,2000)});
  const entries=[...byKey.values()];
  try{
    const response=await fetcher("https://api.openai.com/v1/embeddings",{method:"POST",headers:{Authorization:`Bearer ${config.openaiApiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:config.openaiEmbeddingModel,input:[query,...entries.map(item=>item.input)],encoding_format:"float"})}),data=await response.json();
    if(!response.ok||!Array.isArray(data.data)||data.data.length!==entries.length+1)throw new Error(data.error?.message||"Embedding response was invalid");
    const queryVector=data.data[0].embedding,ranked=entries.map((entry,index)=>({...entry,score:cosine(queryVector,data.data[index+1].embedding)})).sort((a,b)=>b.score-a.score),selected=new Set(ranked.slice(0,30).map(item=>key(item.type,item.row)));
    for(const type of types)for(const row of local[type])selected.add(key(type,row));
    return {...Object.fromEntries(types.map(type=>[type,ranked.filter(item=>item.type===type&&selected.has(key(type,item.row))).map(item=>({...item.row,ranking:{mode:"semantic",source:"OpenAI",model:config.openaiEmbeddingModel,score:item.score}}))])),ranking:{mode:"semantic",source:"OpenAI",model:config.openaiEmbeddingModel}};
  }catch(error){return {...fallback,ranking:{...fallback.ranking,fallback:String(error.message).slice(0,200)}}}
}
