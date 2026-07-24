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

test("password login stores only hashes and sessions revoke",async()=>{
  const dir=temp();const {openDatabase}=await import("../server/db.mjs");const auth=await import("../server/auth.mjs");const db=openDatabase(join(dir,"test.sqlite"));
  try{
    await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db);
    const session=await auth.login({email:"owner@example.com",password:"correct horse battery staple"},db,1);assert.ok(session.token);assert.equal(auth.authenticate(session.token,db).email,"owner@example.com");assert.equal(db.prepare("SELECT token_hash FROM sessions").get().token_hash.includes(session.token),false);assert.equal(auth.revokeSession(session.token,db),true);assert.equal(auth.authenticate(session.token,db),null);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("unsafe cross-origin requests and repeated login attempts are rejected",async()=>{
  const {requireSameOrigin}=await import("../server/http.mjs");const {enforceLoginRateLimit,clearLoginRateLimit}=await import("../server/auth.mjs");
  assert.throws(()=>requireSameOrigin(new Request("https://lifeos.test/api/v1/tasks",{method:"POST",headers:{origin:"https://evil.test"}})),error=>error.status===403);
  requireSameOrigin(new Request("https://lifeos.test/api/v1/tasks",{method:"POST",headers:{origin:"https://lifeos.test"}}));
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
});
