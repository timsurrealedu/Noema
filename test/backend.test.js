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

test("TOTP login follows RFC 6238 and rejects replay",async()=>{
  const dir=temp(),secret="GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db);assert.equal(auth.totp(secret,1),"287082");assert.equal(auth.verifyTotp(secret,"287082",user.id,db,1),true);assert.equal(auth.verifyTotp(secret,"287082",user.id,db,1),false);const code=auth.totp(secret),challenge=await auth.login({email:user.email,password:"correct horse battery staple",totpSecret:secret},db,1);assert.equal(challenge.mfaRequired,true);const session=await auth.login({email:user.email,password:"correct horse battery staple",totpSecret:secret,totpCode:code},db,1);assert.ok(session.token);assert.ok(auth.authenticate(session.token,db).mfa_verified_at)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("persisted MFA encrypts secrets and consumes recovery codes once",async()=>{
  const dir=temp(),key="test-encryption-key-with-more-than-32-characters";const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),enrollment=auth.beginTotpEnrollment(user.id,user.email,key,db);assert.match(enrollment.uri,/^otpauth:\/\/totp\//);const confirmed=await auth.confirmTotpEnrollment(user.id,auth.totp(enrollment.secret),key,db);assert.equal(confirmed.recoveryCodes.length,10);const row=db.prepare("SELECT totp_secret_enc FROM users WHERE id=?").get(user.id);assert.ok(row.totp_secret_enc);assert.equal(row.totp_secret_enc.includes(enrollment.secret),false);const session=await auth.login({email:user.email,password:"correct horse battery staple",recoveryCode:confirmed.recoveryCodes[0],encryptionKey:key},db,1);assert.ok(session.token);const replay=await auth.login({email:user.email,password:"correct horse battery staple",recoveryCode:confirmed.recoveryCodes[0],encryptionKey:key},db,1);assert.equal(replay.mfaRequired,true);assert.equal(await auth.disableTotp(user.id,"correct horse battery staple",key,db),true);assert.deepEqual(auth.mfaStatus(user.id,db),{enabled:false,enrollmentPending:false,recoveryCodes:0})}finally{db.close();rmSync(dir,{recursive:true,force:true})}
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

test("compiler uses a git worktree when repoDir is a repository",async()=>{
  const repo=temp();const {runCode,prepareWorktree,cleanupWorktree,compilerCapabilities}=await import("../server/compiler.mjs");const {spawnSync}=await import("node:child_process");
  try{
    spawnSync("git",["init","-q",repo],{shell:false});
    spawnSync("git",["-C",repo,"config","user.email","test@example.com"],{shell:false});
    spawnSync("git",["-C",repo,"config","user.name","Test"],{shell:false});
    spawnSync("git",["-C",repo,"commit","--allow-empty","-m","init"],{shell:false});
    const session=prepareWorktree(repo);assert.equal(session.isWorktree,true);cleanupWorktree(session);
    const result=await runCode({language:"javascript",code:"console.log('wt')"},{enabled:true,isolate:false,repoDir:repo,timeoutMs:3000,maxOutputBytes:1024});
    assert.equal(result.code,0);assert.equal(result.output.trim(),"wt");
  }finally{rmSync(repo,{recursive:true,force:true})}
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

test("Gemini multimodal sends base64 inline data and returns extracted text",async()=>{
  const {runGeminiMultimodal}=await import("../server/ai.mjs");let request;
  const result=await runGeminiMultimodal({prompt:"OCR this",base64:"abc",mimeType:"image/png",schema:{type:"object",required:["text"],properties:{text:{type:"string"}}},config:{geminiApiKey:"test-secret",geminiModel:"gemini-2.5-flash"},fetcher:async(url,options)=>{request={url,options};return Response.json({candidates:[{content:{parts:[{text:'{"text":"hello"}'}]}}]})}});
  assert.equal(result.provider,"gemini");assert.equal(result.result.text,"hello");
  const body=JSON.parse(request.options.body);assert.ok(body.contents[0].parts.some(part=>part.inlineData&&part.inlineData.data==="abc"&&part.inlineData.mimeType==="image/png"));
});

test("OpenAI fallback routes simple and complex work to appropriate models",async()=>{
  const {runOpenAI,selectOpenAIModel}=await import("../server/ai.mjs");const config={openaiApiKey:"test-secret",openaiFastModel:"chat-latest",openaiReasoningModel:"gpt-5.6"};let request;
  assert.deepEqual(selectOpenAIModel("schedule",config),{model:"chat-latest",reasoningEffort:null});assert.deepEqual(selectOpenAIModel("note",config),{model:"gpt-5.6",reasoningEffort:"low"});assert.deepEqual(selectOpenAIModel("math",config),{model:"gpt-5.6",reasoningEffort:"medium"});
  const result=await runOpenAI({prompt:"Explain",schema:{type:"object",required:["answer"],properties:{answer:{type:"string"}}},workload:"math",config,fetcher:async(url,options)=>{request={url,options};return Response.json({output_text:'{"answer":"shown"}'})}}),body=JSON.parse(request.options.body);
  assert.equal(result.provider,"openai");assert.equal(result.model,"gpt-5.6");assert.equal(result.reasoningEffort,"medium");assert.equal(request.url,"https://api.openai.com/v1/responses");assert.equal(request.options.headers.Authorization,"Bearer test-secret");assert.equal(request.url.includes("test-secret"),false);assert.deepEqual(body.reasoning,{effort:"medium"});assert.equal(body.text.format.type,"json_schema");assert.equal(body.store,false);
});

test("representative AI workloads use the intended routing tier",async()=>{
  const {selectOpenAIModel}=await import("../server/ai.mjs"),config={openaiFastModel:"chat-latest",openaiReasoningModel:"gpt-5.6"};
  const fixtures={schedule:["chat-latest",null],note:["gpt-5.6","low"],code:["gpt-5.6","low"],research:["gpt-5.6","medium"],math:["gpt-5.6","medium"]};
  for(const [workload,expected] of Object.entries(fixtures)){const route=selectOpenAIModel(workload,config);assert.deepEqual([route.model,route.reasoningEffort],expected,workload)}
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

test("deterministic extraction reads DOCX word/document.xml",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const {storeAsset}=await import("../server/objects.mjs");const {extractText}=await import("../server/extract.mjs");const {execFileSync}=require("node:child_process");const db=openDatabase(join(dir,"test.sqlite"));
  const config={dataDir:dir,objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs")};require("node:fs").mkdirSync(config.objectsDir,{recursive:true});require("node:fs").mkdirSync(config.jobsDir,{recursive:true});
  try{
    const docxDir=join(dir,"docx");require("node:fs").mkdirSync(join(docxDir,"word"),{recursive:true});
    require("node:fs").writeFileSync(join(docxDir,"word","document.xml"),"<w:document><w:body><w:p><w:t>Hello from DOCX</w:t></w:p></w:body></w:document>");
    const docxPath=join(dir,"sample.docx");execFileSync("zip",["-r",docxPath,"word"],{cwd:docxDir});
    const asset=await storeAsset({stream:require("node:stream").Readable.from([require("node:fs").readFileSync(docxPath)]),name:"sample.docx",mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},config,db);
    const extracted=await extractText(asset,config);assert.equal(extracted.tool,"docx");assert.equal(extracted.text,"Hello from DOCX");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("OCR extracts text from images via Gemini multimodal",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const {storeAsset}=await import("../server/objects.mjs");const {extractText}=await import("../server/extract.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  const config={dataDir:dir,objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs"),geminiApiKey:"test-secret",geminiModel:"gemini-2.5-flash"};require("node:fs").mkdirSync(config.objectsDir,{recursive:true});require("node:fs").mkdirSync(config.jobsDir,{recursive:true});
  try{
    const asset=await storeAsset({stream:require("node:stream").Readable.from([Buffer.from([137,80,78,71])]),name:"scan.png",mime:"image/png"},config,db);
    const extracted=await extractText(asset,config,async()=>Response.json({candidates:[{content:{parts:[{text:'{"text":"scanned text"}'}]}}]}));
    assert.equal(extracted.tool,"gemini");assert.equal(extracted.text,"scanned text");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("transcription extracts text from audio via Gemini multimodal",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const {storeAsset}=await import("../server/objects.mjs");const {extractText}=await import("../server/extract.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  const config={dataDir:dir,objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs"),geminiApiKey:"test-secret",geminiModel:"gemini-2.5-flash"};require("node:fs").mkdirSync(config.objectsDir,{recursive:true});require("node:fs").mkdirSync(config.jobsDir,{recursive:true});
  try{
    const asset=await storeAsset({stream:require("node:stream").Readable.from([Buffer.from([255,251,144,100])]),name:"note.mp3",mime:"audio/mpeg"},config,db);
    const extracted=await extractText(asset,config,async()=>Response.json({candidates:[{content:{parts:[{text:'{"text":"spoken words"}'}]}}]}));
    assert.equal(extracted.tool,"gemini");assert.equal(extracted.text,"spoken words");
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

test("file capture creates a capture with a stored asset",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  const config={dataDir:dir,objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs")};require("node:fs").mkdirSync(config.objectsDir,{recursive:true});require("node:fs").mkdirSync(config.jobsDir,{recursive:true});
  try{
    const capture=await core.createFileCapture({stream:require("node:stream").Readable.from(["# Report"]),name:"report.md",type:"text/markdown",size:8},db);
    assert.equal(capture.source,"file");assert.equal(capture.sourceLabel,"Text · 1 KB");assert.equal(capture.assets.length,1);assert.equal(capture.assets[0].name,"report.md");
    const state=core.listState(db);assert.equal(state.captures.length,1);assert.equal(state.captures[0].assets.length,1);
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

test("projects persist, version-conflict, and undo restores deletions",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    const created=core.saveProject({id:"p1",name:"LifeOS",status:"Active",summary:"Build backend"},db);
    assert.equal(created.name,"LifeOS");assert.equal(created.version,1);
    const updated=core.saveProject({id:"p1",name:"LifeOS v2",status:"Active",summary:"Build backend",version:1},db);
    assert.equal(updated.version,2);
    assert.throws(()=>core.saveProject({id:"p1",name:"Stale",version:1},db),error=>error.status===409&&error.code==="VERSION_CONFLICT");
    const state=core.listState(db);assert.equal(state.projects.length,1);
    core.deleteProject("p1",db,"owner");assert.equal(core.listState(db).projects.length,0);
    const delAudit=core.listAuditEvents(10,db).find(event=>event.action==="delete"&&event.objectType==="project");
    core.undoAuditEvent(delAudit.id,db,"owner");assert.equal(core.listState(db).projects[0].name,"LifeOS v2");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("task dependencies block self- and circular references and undo",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.saveTask({id:"t1",title:"First",project:"Inbox",due:"Today"},db);
    core.saveTask({id:"t2",title:"Second",project:"Inbox",due:"Today"},db);
    core.saveTaskDependency("t1","t2",db,"owner");
    assert.throws(()=>core.saveTaskDependency("t1","t1",db),error=>error.status===409);
    assert.throws(()=>core.saveTaskDependency("t2","t1",db),error=>error.status===409);
    assert.deepEqual(core.dependenciesForTask("t1",db).map(d=>d.dependsOnTaskId),["t2"]);
    assert.deepEqual(core.dependentsForTask("t2",db).map(d=>d.taskId),["t1"]);
    const depAudit=core.listAuditEvents(10,db).find(event=>event.action==="create"&&event.objectType==="task_dependency");
    core.undoAuditEvent(depAudit.id,db,"owner");assert.equal(core.dependenciesForTask("t1",db).length,0);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("note links are extracted from [[Title]] and support backlinks",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.saveNote({id:"n1",title:"Target note",content:"Body",tags:[]},db);
    core.saveNote({id:"n2",title:"Source note",content:"See [[Target note]] and [[Target note|alias]]",tags:[]},db);
    assert.deepEqual(core.noteLinks("See [[Target note]] and [[Target note|alias]]"),["Target note"]);
    const links=core.linksForNote("n2",db);assert.equal(links.length,1);assert.equal(links[0].targetNoteId,"n1");
    const backlinks=core.backlinksForNote("n1",db);assert.equal(backlinks.length,1);assert.equal(backlinks[0].sourceNoteId,"n2");
    const state=core.listState(db);assert.equal(state.noteLinks.length,1);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("notes retain versions, restore snapshots, and round-trip Markdown",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    const note=core.importMarkdown("# Imported\n\nFirst body",db,"owner");
    core.saveNote({id:note.id,title:"Imported",content:"Second body",tags:["study"],version:1},db,"owner");
    assert.deepEqual(core.noteVersions(note.id,db).map(item=>item.version),[2,1]);
    const restored=core.restoreNoteVersion(note.id,1,db,"owner");assert.equal(restored.version,3);assert.match(restored.content,/First body/);
    assert.match(core.exportMarkdown(note.id,db),/^# Imported/);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("unified search finds notes, tasks, events, projects, and captures",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const core=await import("../server/core.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.saveNote({title:"Quantum notes",content:"wave function"},db);core.saveTask({title:"Review quantum",project:"Physics",due:"Today"},db);core.saveEvent({title:"Quantum seminar",day:2,time:"10:00",location:"Lab"},db);core.saveProject({name:"Quantum lab",summary:"Physics"},db);core.createCapture({text:"quantum question"},db);
    const found=core.searchAll("quantum",db);assert.equal(found.notes.length,1);assert.equal(found.tasks.length,1);assert.equal(found.events.length,1);assert.equal(found.projects.length,1);assert.equal(found.captures.length,1);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("study courses, assignments, quizzes, and spaced reviews persist",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const study=await import("../server/modules.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{const course=study.saveCourse({name:"Algorithms",code:"COMP6047",term:"2026"},db);const assignment=study.saveAssignment({courseId:course.id,title:"Dynamic programming",dueAt:"2026-08-01T00:00:00.000Z"},db);assert.equal(study.listAssignments(course.id,db)[0].id,assignment.id);const card=study.saveCard({courseId:course.id,front:"Complexity?",back:"O(n)"},db);const reviewed=study.reviewCard(card.id,5,db);assert.equal(reviewed.repetitions,1);assert.equal(reviewed.interval_days,1);const quiz=study.saveQuiz({courseId:course.id,title:"Complexity",questions:[{prompt:"Linear?",choices:["O(1)","O(n)"],answer:1}]},db);assert.equal(study.submitQuiz(quiz.id,[1],db).score,100);assert.equal(db.prepare("SELECT COUNT(*) count FROM card_reviews").get().count,1)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("notifications, push subscriptions, and automation runs persist",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const modules=await import("../server/modules.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{const notice=modules.createNotification({kind:"assignment",title:"Due soon"},db);modules.readNotification(notice.id,db);assert.ok(modules.listNotifications(db)[0].read_at);modules.savePushSubscription({endpoint:"https://push.example/sub",keys:{p256dh:"x",auth:"y"}},db);assert.equal(db.prepare("SELECT COUNT(*) count FROM push_subscriptions").get().count,1);const tick=new Date(),automation=modules.saveAutomation({name:"Daily review",triggerKind:"schedule",schedule:`${tick.getMinutes()} ${tick.getHours()} * * *`,actionKind:"notification",config:{title:"Review now"}},db);const runs=modules.runScheduledAutomations(tick,db);assert.equal(runs.length,1);assert.equal(modules.automationRuns(automation.id,db).length,1);assert.deepEqual(modules.automationMetrics(automation.id,db).states,{completed:1});assert.equal(modules.runScheduledAutomations(new Date(tick.getTime()+1000),db).length,0)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("task and event reminders deliver once across restarts",async()=>{
  const dir=temp(),path=join(dir,"test.sqlite"),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),modules=await import("../server/modules.mjs");let db=openDatabase(path);
  try{const reminderAt=new Date(Date.now()-1000).toISOString();core.saveTask({title:"Submit report",project:"Work",due:"Today",reminderAt},db);core.saveEvent({title:"Standup",day:1,time:"09:00",reminderAt},db);assert.equal(modules.deliverDueReminders(new Date(),db).length,2);db.close();db=openDatabase(path);assert.equal(modules.deliverDueReminders(new Date(),db).length,0);assert.equal(modules.listNotifications(db).filter(item=>item.kind.endsWith("-reminder")).length,2)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("Draft optimization remains a reviewable and reversible proposal",async()=>{
  const dir=temp(),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),jobs=await import("../server/jobs.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{const note=core.saveNote({title:"Rough draft",content:"# Rough\n\noriginal",tags:[],draft:true},db,"owner"),proposal=core.requestNoteOptimization(note.id,"organize",db),job=jobs.getJob(proposal.jobId,db);assert.equal(job.kind,"note-optimize");core.finishNoteOptimization(proposal.id,{content:"# Organized\n\nproposed",summary:"Improved structure"},"test",db);assert.equal(core.noteOptimizations(note.id,db)[0].state,"ready");const applied=core.applyNoteOptimization(proposal.id,db,"owner");assert.equal(applied.draft,0);assert.match(applied.content,/proposed/);const restored=core.restoreNoteVersion(note.id,1,db,"owner");assert.match(restored.content,/original/)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("Tutor sessions persist and note insertion is provenance-aware and reversible",async()=>{
  const dir=temp(),{randomUUID}=require("node:crypto"),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),skills=await import("../server/skills.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{const note=core.saveNote({title:"Tutor target",content:"# Target\n\nOriginal",tags:[]},db,"owner"),sessionId=randomUUID(),messageId=randomUUID(),time=new Date().toISOString();db.prepare("INSERT INTO tutor_sessions(id,kind,subject_id,subject_title,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(sessionId,"note",note.id,note.title,time,time);db.prepare("INSERT INTO tutor_messages(id,session_id,role,content,citations_json,provider,created_at) VALUES(?,?,?,?,?,?,?)").run(messageId,sessionId,"assistant","Grounded explanation",JSON.stringify(["Tutor target"]),"test",time);assert.equal(skills.loadTutorSession("note",note.id,db).messages.length,1);const inserted=skills.insertTutorMessage(messageId,note.id,db,"owner");assert.match(inserted.content,/Grounded explanation/);assert.throws(()=>skills.insertTutorMessage(messageId,note.id,db,"owner"),error=>error.status===409);const restored=core.restoreNoteVersion(note.id,1,db,"owner");assert.doesNotMatch(restored.content,/Grounded explanation/)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("operations redact logs, import v1 data, and verify encrypted backups",async()=>{
  const dir=temp(),fs=require("node:fs");const {openDatabase}=await import("../server/db.mjs"),ops=await import("../server/ops.mjs");const db=openDatabase(join(dir,"lifeos.sqlite")),config={dataDir:dir,dbPath:join(dir,"lifeos.sqlite"),objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs"),backupsDir:join(dir,"backups"),backupKey:"correct horse battery staple backup key",backupRetention:2,minFreeBytes:0};
  try{fs.mkdirSync(config.objectsDir);fs.mkdirSync(config.jobsDir);fs.mkdirSync(config.backupsDir);const imported=join(dir,"v1");fs.mkdirSync(imported);fs.mkdirSync(join(imported,"attachments"));fs.writeFileSync(join(imported,"note.md"),"# Legacy note\n\nPortable");fs.writeFileSync(join(imported,"tasks.json"),JSON.stringify([{title:"Legacy task",project:"Inbox",due:"Today"}]));fs.writeFileSync(join(imported,"attachments","source.txt"),"original");assert.deepEqual(await ops.importV1(imported,db,config),{notes:1,tasks:1,events:0,attachments:1});let line;ops.log("info","auth",{password:"secret",nested:{apiKey:"key"}},value=>line=value);assert.doesNotMatch(line,/secret|\"key\"/);const backup=ops.createBackup(config,db);assert.equal(ops.verifyBackup(backup.path,config).ok,true);assert.equal(ops.healthReport(db,config).database,"ok")}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("workspace export includes portable data and excludes credentials",async()=>{
  const dir=temp(),{openDatabase}=await import("../server/db.mjs"),ops=await import("../server/ops.mjs"),core=await import("../server/core.mjs"),auth=await import("../server/auth.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db);core.saveTask({title:"Portable task",project:"Inbox",due:"Today"},db);const exported=ops.exportWorkspace(db);assert.equal(exported.format,"lifeos-workspace");assert.equal(exported.data.tasks[0].title,"Portable task");assert.equal(exported.data.users,undefined);assert.equal(exported.data.sessions,undefined);assert.equal(exported.data.push_subscriptions,undefined);assert.equal(exported.data.idempotency_keys,undefined)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
