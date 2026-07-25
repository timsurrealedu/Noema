const test=require("node:test");
const assert=require("node:assert/strict");
const {mkdtempSync,rmSync}=require("node:fs");
const {tmpdir}=require("node:os");
const {join}=require("node:path");

const temp=()=>mkdtempSync(join(tmpdir(),"lifeos-backend-"));

test("SQLite core objects persist and remain searchable",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.saveTask({id:"t1",title:"Ship backend",project:"LifeOS",due:"Today",priority:"High"},db);
    core.saveEvent({id:"e1",title:"Backend review",day:5,time:"10:00",top:100,height:58},db);
    core.saveNote({id:"n1",title:"Backend plan",content:"# Backend plan\n\nSQLite and Codex",tags:["lifeos"]},db);
    core.createCapture({id:"c1",text:"Plan tomorrow",source:"typed"},db);
    const state=core.listState(db);assert.equal(state.tasks[0].title,"Ship backend");assert.equal(state.events[0].title,"Backend review");assert.equal(state.notes[0].tags[0],"lifeos");assert.equal(state.captures[0].status,"review");assert.equal(core.searchNotes("SQLite",db)[0].id,"n1");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("mutations reject stale versions and replay idempotency keys",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const {idempotent}=await import("../server/http.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.saveTask({id:"t1",title:"First",project:"Inbox",due:"Today"},db);const updated=core.saveTask({id:"t1",title:"Second",project:"Inbox",due:"Today",version:1},db);assert.equal(updated.version,2);assert.throws(()=>core.saveTask({id:"t1",title:"Stale",project:"Inbox",due:"Today",version:1},db),error=>error.status===409&&error.code==="VERSION_CONFLICT");
    const request=new Request("https://lifeos.test/api/v1/tasks",{method:"POST",headers:{"Idempotency-Key":"same-request"}}),input={title:"Once"};let calls=0,work=()=>({calls:++calls});assert.deepEqual(idempotent(request,"owner",input,work,db).value,{calls:1});assert.deepEqual(idempotent(request,"owner",input,work,db).value,{calls:1});assert.equal(calls,1);assert.throws(()=>idempotent(request,"owner",{title:"Different"},work,db),error=>error.status===409&&error.code==="IDEMPOTENCY_CONFLICT");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("password login stores only hashes and sessions revoke",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const auth=await import("../server/auth.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db);
    const session=await auth.login({email:"owner@example.com",password:"correct horse battery staple"},db,1);assert.ok(session.token);assert.equal(auth.authenticate(session.token,db).email,"owner@example.com");assert.equal(db.prepare("SELECT token_hash FROM sessions").get().token_hash.includes(session.token),false);assert.equal(auth.revokeSession(session.token,db),true);assert.equal(auth.authenticate(session.token,db),null);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("unsafe cross-origin requests and repeated login attempts are rejected",async()=>{
  const {requireSameOrigin}=await import("../server/http.mjs");const {enforceLoginRateLimit,clearLoginRateLimit}=await import("../server/auth.mjs");
  assert.throws(()=>requireSameOrigin(new Request("https://internal.test/api/v1/tasks",{method:"POST",headers:{host:"lifeos.test",origin:"https://evil.test"}})),error=>error.status===403);
  requireSameOrigin(new Request("https://internal.test/api/v1/tasks",{method:"POST",headers:{host:"lifeos.test",origin:"https://lifeos.test"}}));
  const key=`rate-${Date.now()}`;for(let i=0;i<5;i++)enforceLoginRateLimit(key);assert.throws(()=>enforceLoginRateLimit(key),error=>error.status===429);clearLoginRateLimit(key);
});

test("durable jobs claim once and record events",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const jobs=await import("../server/jobs.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{const id=jobs.enqueueJob("interpret",{captureId:"c1"},db);assert.equal(jobs.claimJob(["interpret"],60,db).id,id);assert.equal(jobs.claimJob(["interpret"],60,db),null);jobs.finishJob(id,{ok:true},db);const job=jobs.getJob(id,db);assert.equal(job.state,"completed");assert.deepEqual(job.result,{ok:true});assert.deepEqual(job.events.map(e=>e.type),["queued","claimed","completed"])}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("compiler runs supported code with limits and rejects unsafe languages",async()=>{
  const dir=temp();const {runCode}=await import("../server/compiler.mjs");try{const result=await runCode({language:"javascript",code:"console.log(6 * 7)"},{enabled:true,isolate:false,jobsDir:dir,timeoutMs:3000,maxOutputBytes:1024});assert.equal(result.code,0);assert.equal(result.output.trim(),"42");await assert.rejects(()=>runCode({language:"shell",code:"id"},{enabled:true,isolate:false,jobsDir:dir}),/Unsupported language/)}finally{rmSync(dir,{recursive:true,force:true})}
});

test("Codex runner uses JSON, ephemeral mode, schema, and an explicit sandbox",async()=>{
  const {codexArgs}=await import("../server/codex.mjs");const args=codexArgs({cwd:"/tmp/job",schemaPath:"/tmp/job/schema.json"});assert.deepEqual(args,["exec","--json","--ephemeral","--ignore-user-config","--skip-git-repo-check","--output-schema","/tmp/job/schema.json","--sandbox","read-only","--cd","/tmp/job","-"]);assert.equal(args.includes("--dangerously-bypass-approvals-and-sandbox"),false);
  assert.equal(codexArgs({cwd:"/tmp/job",schemaPath:"/tmp/job/schema.json",search:true})[0],"--search");
});

test("all v1 AI workflows are registered as managed Codex skills",async()=>{
  const {listSkills,buildSkillPrompt}=await import("../server/skills.mjs");const ids=listSkills().map(skill=>skill.id);
  assert.deepEqual(ids,["process-inbox","research","weekly-review","refresh-home","assistant","note-tutor","code-tutor","note-augment","semantic-search","autosort"]);
  assert.match(buildSkillPrompt("code-tutor",{question:"why?"},"main.js"),/managed LifeOS skill/);
  assert.throws(()=>buildSkillPrompt("unknown",{}),error=>error.status===404);
});

test("Gemini fallback keeps keys in headers and returns structured output",async()=>{
  const {geminiSchema,isCapacityError,runGemini}=await import("../server/ai.mjs");let request;
  const result=await runGemini({prompt:"Tutor",schema:{type:"object",required:["answer"],properties:{answer:{type:"string",maxLength:20}}},config:{geminiApiKey:"test-secret",geminiModel:"gemini-2.5-flash"},fetcher:async(url,options)=>{request={url,options};return Response.json({candidates:[{content:{parts:[{text:'{"answer":"grounded"}'}]}}]})}});
  assert.equal(result.provider,"gemini");assert.equal(result.result.answer,"grounded");assert.equal(request.options.headers["x-goog-api-key"],"test-secret");assert.equal(request.url.includes("test-secret"),false);assert.equal("maxLength" in geminiSchema({maxLength:2,type:"string"}),false);assert.equal(isCapacityError(new Error("429 RESOURCE_EXHAUSTED")),true);assert.equal(isCapacityError(new Error("invalid schema")),false);
});

test("OpenAI fallback routes simple and complex work to appropriate models",async()=>{
  const {runOpenAI,selectOpenAIModel}=await import("../server/ai.mjs");const config={openaiApiKey:"test-secret",openaiFastModel:"chat-latest",openaiReasoningModel:"gpt-5.6"};let request;
  assert.deepEqual(selectOpenAIModel("schedule",config),{model:"chat-latest",reasoningEffort:null});assert.deepEqual(selectOpenAIModel("note",config),{model:"gpt-5.6",reasoningEffort:"low"});assert.deepEqual(selectOpenAIModel("math",config),{model:"gpt-5.6",reasoningEffort:"medium"});
  const result=await runOpenAI({prompt:"Explain",schema:{type:"object",required:["answer"],properties:{answer:{type:"string"}}},workload:"math",config,fetcher:async(url,options)=>{request={url,options};return Response.json({output_text:'{"answer":"shown"}'})}}),body=JSON.parse(request.options.body);
  assert.equal(result.provider,"openai");assert.equal(result.model,"gpt-5.6");assert.equal(result.reasoningEffort,"medium");assert.equal(request.url,"https://api.openai.com/v1/responses");assert.equal(request.options.headers.Authorization,"Bearer test-secret");assert.equal(request.url.includes("test-secret"),false);assert.deepEqual(body.reasoning,{effort:"medium"});assert.equal(body.text.format.type,"json_schema");assert.equal(body.store,false);
});
