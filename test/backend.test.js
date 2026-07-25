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
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    const key=`rate-${Date.now()}`;for(let i=0;i<5;i++)enforceLoginRateLimit(key,5,15*60_000,db);assert.throws(()=>enforceLoginRateLimit(key,5,15*60_000,db),error=>error.status===429);
    db.close();const db2=openDatabase(join(dir,"test.sqlite"));assert.throws(()=>enforceLoginRateLimit(key,5,15*60_000,db2),error=>error.status===429);db2.close();
    const db3=openDatabase(join(dir,"test.sqlite"));clearLoginRateLimit(key,db3);enforceLoginRateLimit(key,5,15*60_000,db3);db3.close();
  }finally{rmSync(dir,{recursive:true,force:true})}
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

test("interpretation apply creates objects transactionally and its undo reverses them",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.createCapture({id:"c1",text:"Meet Dian tomorrow 1pm",source:"typed"},db);
    assert.throws(()=>core.applyCaptureInterpretation("c1",db),error=>error.status===409&&error.code==="NOTHING_TO_APPLY");
    core.saveInterpretation("c1",[{type:"task",title:"Review proposal",detail:"Due tomorrow"},{type:"event",title:"Meeting with Dian",detail:"1pm"},{type:"note",title:"Meeting notes",detail:"Context"}],db);
    const applied=core.applyCaptureInterpretation("c1",db,"owner");
    assert.equal(applied.status,"confirmed");assert.equal(applied.created.length,3);
    const state=core.listState(db);assert.equal(state.tasks.length,1);assert.equal(state.events.length,1);assert.equal(state.notes.length,1);assert.equal(state.captures[0].status,"confirmed");
    assert.equal(core.applyCaptureInterpretation("c1",db).created.length,0);
    const applyAudit=core.listAuditEvents(10,db).find(event=>event.action==="apply"&&event.reversible);
    core.undoAuditEvent(applyAudit.id,db,"owner");
    const after=core.listState(db);assert.equal(after.tasks.length,0);assert.equal(after.events.length,0);assert.equal(after.notes.length,0);assert.equal(after.captures[0].status,"review");
    assert.equal(core.applyCaptureInterpretation("c1",db).created.length,3);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("undo restores prior object versions and rejects irreversible events",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.saveTask({id:"t1",title:"First",project:"Inbox",due:"Today"},db);
    core.saveTask({id:"t1",title:"Second",project:"Inbox",due:"Today",version:1},db);
    const updateAudit=core.listAuditEvents(10,db).find(event=>event.action==="update"&&event.objectType==="task");
    core.undoAuditEvent(updateAudit.id,db);assert.equal(core.listState(db).tasks[0].title,"First");
    const createAudit=core.listAuditEvents(10,db).find(event=>event.action==="create"&&event.objectType==="task");
    core.undoAuditEvent(createAudit.id,db);assert.equal(core.listState(db).tasks.length,0);
    const undoEvent=core.listAuditEvents(10,db).find(event=>event.action==="undo");
    assert.throws(()=>core.undoAuditEvent(undoEvent.id,db),error=>error.status===409&&error.code==="NOT_REVERSIBLE");
    assert.throws(()=>core.undoAuditEvent("missing",db),error=>error.status===404);
    core.saveNote({id:"n1",title:"Versioned",content:"one",tags:["a"]},db);core.saveNote({id:"n1",title:"Versioned",content:"two",version:1},db);
    const noteUpdate=core.listAuditEvents(10,db).find(event=>event.action==="update"&&event.objectType==="note");
    core.undoAuditEvent(noteUpdate.id,db);assert.equal(core.searchNotes("one",db).length,1);assert.equal(core.searchNotes("two",db).length,0);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("queued jobs accept a cancellation flag exactly once per state",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const jobs=await import("../server/jobs.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    const id=jobs.enqueueJob("interpret-capture",{captureId:"c1"},db);
    assert.equal(jobs.cancelJob(id,db),true);assert.equal(jobs.getJob(id,db).cancel_requested,1);
    jobs.finishJob(id,{ok:true},db);assert.equal(jobs.cancelJob(id,db),false);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("object store hashes uploads, deduplicates, and enforces limits",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const {storeAsset,assetPath,getAsset}=await import("../server/objects.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  const config={dataDir:dir,objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs")};require("node:fs").mkdirSync(config.objectsDir,{recursive:true});require("node:fs").mkdirSync(config.jobsDir,{recursive:true});
  try{
    const stream=()=>require("node:stream").Readable.from(["# Lecture notes\n\nTCP slow start"]);
    const first=await storeAsset({stream:stream(),name:"lecture.md",mime:"text/markdown"},config,db);
    assert.match(first.sha256,/^[0-9a-f]{64}$/);assert.equal(first.deduplicated,false);assert.equal(first.size,31);
    const second=await storeAsset({stream:stream(),name:"copy.md",mime:"text/markdown"},config,db);
    assert.equal(second.sha256,first.sha256);assert.equal(second.deduplicated,true);assert.equal(db.prepare("SELECT COUNT(*) count FROM assets").get().count,1);
    assert.ok(require("node:fs").existsSync(assetPath(first.sha256,config)));assert.equal(getAsset(first.id,db).name,"lecture.md");assert.equal(getAsset(first.sha256,db).id,first.id);
    await assert.rejects(()=>storeAsset({stream:stream(),name:"evil.sh",mime:"application/x-sh"},config,db),error=>error.status===415);
    await assert.rejects(()=>storeAsset({stream:require("node:stream").Readable.from([Buffer.alloc(51*1024*1024,1)]),name:"big.pdf",mime:"application/pdf"},config,db),error=>error.status===413);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("deterministic extraction reads text assets and skips unsupported types",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const {storeAsset}=await import("../server/objects.mjs");const {extractText}=await import("../server/extract.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  const config={dataDir:dir,objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs")};require("node:fs").mkdirSync(config.objectsDir,{recursive:true});require("node:fs").mkdirSync(config.jobsDir,{recursive:true});
  try{
    const asset=await storeAsset({stream:require("node:stream").Readable.from(["plain text body"]),name:"note.txt",mime:"text/plain"},config,db);
    const extracted=await extractText(asset,config);assert.equal(extracted.tool,"read");assert.equal(extracted.text,"plain text body");
    const image=await storeAsset({stream:require("node:stream").Readable.from([Buffer.from([137,80,78,71])]),name:"scan.png",mime:"image/png"},config,db);
    assert.equal(await extractText(image,config),null);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("captures link uploaded assets and expose them in state",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const {storeAsset}=await import("../server/objects.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  const config={dataDir:dir,objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs")};require("node:fs").mkdirSync(config.objectsDir,{recursive:true});require("node:fs").mkdirSync(config.jobsDir,{recursive:true});
  try{
    const asset=await storeAsset({stream:require("node:stream").Readable.from(["slides"]),name:"slides.pdf",mime:"application/pdf"},config,db);
    core.createCapture({id:"c1",text:"slides.pdf",source:"file",assetIds:[asset.id]},db);
    const state=core.listState(db);assert.equal(state.captures[0].assets.length,1);assert.equal(state.captures[0].assets[0].name,"slides.pdf");
    assert.throws(()=>core.createCapture({text:"x",assetIds:["missing"]},db),error=>error.status===404);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("failed jobs retry up to max attempts and expired leases are reclaimed",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const jobs=await import("../server/jobs.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    const id=jobs.enqueueJob("interpret-capture",{captureId:"c1"},db);
    jobs.claimJob(["interpret-capture"],60,db);jobs.failJob(id,new Error("boom"),db);
    let job=jobs.getJob(id,db);assert.equal(job.state,"queued");assert.equal(job.attempts,1);assert.equal(job.events.at(-1).type,"retry-scheduled");
    jobs.claimJob(["interpret-capture"],60,db);jobs.failJob(id,"boom",db);
    jobs.claimJob(["interpret-capture"],60,db);jobs.failJob(id,"boom",db);
    job=jobs.getJob(id,db);assert.equal(job.state,"failed");assert.equal(job.attempts,3);assert.equal(job.events.at(-1).type,"failed");
    const stuck=jobs.enqueueJob("skill-run",{skill:"assistant"},db);
    jobs.claimJob(["skill-run"],60,db);
    db.prepare("UPDATE jobs SET lease_until=? WHERE id=?").run(new Date(Date.now()-1000).toISOString(),stuck);
    const reclaimed=jobs.claimJob(["skill-run"],60,db);assert.equal(reclaimed.id,stuck);assert.equal(jobs.getJob(stuck,db).events.at(-1).type,"reclaimed");
    const doomed=jobs.enqueueJob("skill-run",{skill:"assistant"},db);
    jobs.cancelJob(doomed,db);assert.equal(jobs.claimJob(["skill-run"],60,db),null);assert.equal(jobs.getJob(doomed,db).state,"cancelled");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("sessions list per device and revoke individually",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const auth=await import("../server/auth.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db);
    const first=await auth.login({email:"owner@example.com",password:"correct horse battery staple",device:"Pixel 8"},db,1);
    const second=await auth.login({email:"owner@example.com",password:"correct horse battery staple",device:"ThinkPad"},db,1);
    const sessions=auth.listSessions(first.user.id,db);assert.equal(sessions.length,2);assert.equal(sessions[0].device,"ThinkPad");
    const target=sessions.find(session=>session.device==="Pixel 8");
    assert.equal(auth.revokeSessionById(target.id,second.user.id,db),true);assert.equal(auth.authenticate(first.token,db),null);assert.ok(auth.authenticate(second.token,db));
    assert.equal(auth.revokeSessionById(target.id,first.user.id,db),false);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
