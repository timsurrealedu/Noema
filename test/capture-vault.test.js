const test=require("node:test");
const assert=require("node:assert/strict");
const {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync}=require("node:fs");
const {tmpdir}=require("node:os");
const {join,resolve}=require("node:path");

test("capture can propose, apply, and undo a vault note",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-vault-")),vaultDir=join(dir,"vault");mkdirSync(vaultDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),vault=await import("../server/vault.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id},source=vault.connectVault({rootPath:vaultDir},workspace.id,db);
    core.createCapture({id:"c1",text:"Keep this project idea",source:"typed"},db,actor);
    core.saveInterpretation("c1",{schemaVersion:1,summary:"Save the idea in Obsidian",clarifications:[],actions:[{id:"vault-1",type:"vault.note.create",confidence:.9,sourceReferences:["capture:c1",`vault:${source.id}`],arguments:{sourceId:source.id,relativePath:"Ideas/Project Idea.md",title:"Project Idea",content:"# Project Idea\n\nKeep this project idea\n",tags:["ideas"]}}]},db);
    const applied=core.applyCaptureInterpretation("c1",db,actor);
    assert.equal(applied.created.length,1);assert.equal(existsSync(join(vaultDir,"Ideas/Project Idea.md")),true);
    assert.match(readFileSync(join(vaultDir,"Ideas/Project Idea.md"),"utf8"),/tags: \[ideas\]/);
    assert.match(readFileSync(join(vaultDir,"Ideas/Project Idea.md"),"utf8"),/# Project Idea/);
    const event=core.listAuditEvents(10,db,workspace.id).find(item=>item.action==="apply");core.undoAuditEvent(event.id,db,actor);
    assert.equal(existsSync(join(vaultDir,"Ideas/Project Idea.md")),false);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("vault note creation auto-generates MOC notes and maintains clickable wikilinks",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-moc-")),vaultDir=join(dir,"vault");mkdirSync(vaultDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),vault=await import("../server/vault.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id},source=vault.connectVault({rootPath:vaultDir},workspace.id,db);
    // Pre-create parent BINUS MOC
    mkdirSync(join(vaultDir,"University/BINUS"),{recursive:true});
    vault.createVaultNote(source.id,{relativePath:"University/BINUS/BINUS.md",content:"---\ntags: [moc, university, binus]\n---\n# 🎓 BINUS — Map of Content\n\n## Semesters\n- [[SEM 1]]\n\n→ [[University]]\n"},actor,db);
    
    // Now create a note in a new semester and course hierarchy
    const note=vault.createVaultNote(source.id,{
      relativePath:"University/BINUS/SEM3/NetworkPenetrationTesting/Kelas/Session1/Information Gathering.md",
      title:"Information Gathering",
      content:"# Information Gathering\n\nMethodology details.\n",
      tags:["NetworkPenetrationTesting","EthicalHacking"]
    },actor,db);

    // 1. Note has frontmatter tags
    const noteContent=readFileSync(join(vaultDir,"University/BINUS/SEM3/NetworkPenetrationTesting/Kelas/Session1/Information Gathering.md"),"utf8");
    assert.match(noteContent,/tags: \[NetworkPenetrationTesting, EthicalHacking\]/);
    assert.match(noteContent,/# Information Gathering/);

    // 2. Course MOC was generated with clickable link
    const courseMocPath=join(vaultDir,"University/BINUS/SEM3/NetworkPenetrationTesting/Network Penetration Testing.md");
    assert.equal(existsSync(courseMocPath),true);
    const courseMoc=readFileSync(courseMocPath,"utf8");
    assert.match(courseMoc,/tags: \[moc, course, networkpenetrationtesting\]/);
    assert.match(courseMoc,/# 🗺️ Network Penetration Testing — Map of Content/);
    assert.match(courseMoc,/\[\[Information Gathering\]\]/);
    assert.match(courseMoc,/→ \[\[SEM 3\]\]/);

    // 3. Semester MOC was generated with course link
    const semMocPath=join(vaultDir,"University/BINUS/SEM3/SEM 3.md");
    assert.equal(existsSync(semMocPath),true);
    const semMoc=readFileSync(semMocPath,"utf8");
    assert.match(semMoc,/tags: \[moc, semester, sem3\]/);
    assert.match(semMoc,/# 📗 Semester 3 — Map of Content/);
    assert.match(semMoc,/\[\[Network Penetration Testing\]\]/);
    assert.match(semMoc,/→ \[\[BINUS\]\]/);

    // 4. Existing parent BINUS MOC was updated with the new semester
    const binusMoc=readFileSync(join(vaultDir,"University/BINUS/BINUS.md"),"utf8");
    assert.match(binusMoc,/\[\[SEM 3\]\]/);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("vault proposals must cite their connected vault target",async()=>{
  const {validateProposal}=await import("../server/worker/handlers/interpret-capture.mjs"),proposal={schemaVersion:1,summary:"Save it",clarifications:[],actions:[{id:"vault-1",type:"vault.note.create",confidence:.9,sourceReferences:["capture:c1"],arguments:{sourceId:"source-1",relativePath:"Ideas/Idea.md",title:"Idea",content:"# Idea",tags:[]}}]};
  assert.throws(()=>validateProposal(proposal,new Set(["capture:c1","vault:source-1"])),/cite its target vault source/);
  proposal.actions[0].sourceReferences.push("vault:source-1");assert.equal(validateProposal(proposal,new Set(["capture:c1","vault:source-1"])),proposal);
});

test("vault proposals validate placement paths against known vault sources",async()=>{
  const {validateProposal}=await import("../server/worker/handlers/interpret-capture.mjs"),sources=new Set(["capture:c1","vault:vs1"]),vaultIds=new Set(["vs1"]);
  const mk=path=>({schemaVersion:1,summary:"s",clarifications:[],actions:[{id:"v1",type:"vault.note.create",confidence:.9,sourceReferences:["capture:c1","vault:vs1"],arguments:{sourceId:"vs1",relativePath:path,title:"T",content:"# T",tags:[]}}]});
  validateProposal(mk("Uni/BINUS/Sem3/Network Penetration Testing/Kelas/Session 1/Information Gathering.md"),sources,vaultIds);
  assert.throws(()=>validateProposal(mk("../escape.md"),sources,vaultIds),/path is invalid/);
  assert.throws(()=>validateProposal(mk("a/b/c/d/e/f/g/h/i.md"),sources,vaultIds),/nesting exceeds/);
  assert.throws(()=>validateProposal(mk("note.txt"),sources,vaultIds),/must end in \.md/);
  assert.throws(()=>validateProposal(mk("X.md"),sources,new Set(["vs2"])),/unknown vault source/);
});

test("vault folder context lists folders under a budget and reports truncation",async()=>{
  const {vaultFolderContext}=await import("../server/worker/handlers/interpret-capture.mjs");
  const index=new Map([["s1",["Uni","Uni/BINUS","Work","Ideas"]]]);
  const full=vaultFolderContext([{id:"s1",name:"Obsidian"}],index,4000);
  assert.match(full.text,/Source ID: vault:s1/);assert.match(full.text,/Folders \(4\):/);assert.match(full.text,/Uni\/BINUS\//);assert.equal(full.truncated,false);
  const tight=vaultFolderContext([{id:"s1",name:"Obsidian"}],index,60);
  assert.equal(tight.truncated,true);assert.equal(tight.text.includes("Ideas/"),false);
});

test("capture prompts include vault folder context and placement rules",async()=>{
  const {vaultPlacementInstructions}=await import("../server/worker/handlers/interpret-capture.mjs");
  const instructions=vaultPlacementInstructions();
  assert.match(instructions,/never assume a fixed structure/);
  assert.match(instructions,/adapt to the existing folder structure/i);
  assert.match(instructions,/ending in \.md/);
});

test("Gemini receives a supported capture proposal schema",async()=>{
  const {geminiSchema}=await import("../server/ai.mjs"),{captureProposalSchema}=await import("../server/worker/handlers/interpret-capture.mjs"),schema=geminiSchema(captureProposalSchema),text=JSON.stringify(schema);
  assert.equal(text.includes("additionalProperties"),false);assert.equal(text.includes("oneOf"),false);assert.equal(text.includes("anyOf"),false);assert.equal(text.includes("maxItems"),false);assert.equal(schema.properties.schemaVersion.type,"integer");assert.equal(schema.properties.schemaVersion.enum,undefined);assert.deepEqual(schema.properties.actions.items.properties.type.enum,["task.create","event.create","note.create","vault.note.create"]);
});

test("capture prompts state the exact action JSON contract",async()=>{
  const {captureProposalInstructions}=await import("../server/worker/handlers/interpret-capture.mjs");
  const instructions=captureProposalInstructions();
  for(const type of ["task.create","event.create","note.create","vault.note.create"])assert.match(instructions,new RegExp(type.replace(".","\\.")));assert.match(instructions,/sourceReferences/);assert.match(instructions,/arguments/);
  assert.match(instructions,/linkedActionId/);
  assert.match(instructions,/clock time[^.]+full ISO 8601 timestamp/i);
  assert.match(instructions,/date-only[^.]+no clock time/i);
  assert.match(captureProposalInstructions([60,30]),/\[60,30\]/);
});

test("capture action parsing keeps the first complete Gemini array",async()=>{
  const {parseActionsJson}=await import("../server/worker/handlers/interpret-capture.mjs");
  assert.deepEqual(parseActionsJson('[{"id":"task-1"}] trailing text'),[{id:"task-1"}]);
});

test("capture tasks create linked timed or all-day calendar events",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-schedule-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.createCapture({id:"timed",text:"Study",source:"typed"},db);
    core.saveInterpretation("timed",{schemaVersion:1,summary:"Study",clarifications:[],actions:[{id:"t",type:"task.create",confidence:.9,sourceReferences:["capture:timed"],arguments:{title:"Study",dueAt:"2026-08-13T10:00:00+07:00",project:"Inbox",linkedActionId:null}}]},db);
    core.applyCaptureInterpretation("timed",db);const timed=core.listState(db);assert.equal(timed.tasks[0].reminderAt,null);assert.equal(timed.events[0].endAt,"2026-08-13T04:00:00.000Z");assert.equal(timed.events[0].timezone,"Asia/Jakarta");assert.equal(timed.events[0].time,"10:00");assert.equal(timed.events[0].allDay,false);assert.equal(timed.events[0].taskId,timed.tasks[0].id);assert.deepEqual(timed.calendarItems.map(item=>item.kind),["event"]);
    assert.equal(timed.tasks[0].scheduledStartAt,"2026-08-13T03:00:00.000Z");assert.equal(timed.tasks[0].scheduledEndAt,"2026-08-13T04:00:00.000Z");
    const expectedReminders=(await import("../server/settings.mjs")).reminderOffsets().length;assert.equal(db.prepare("SELECT COUNT(*) count FROM event_reminders WHERE event_id=?").get(timed.events[0].id).count,expectedReminders);
    core.createCapture({id:"day",text:"Submit",source:"typed"},db);
    core.saveInterpretation("day",{schemaVersion:1,summary:"Submit",clarifications:[],actions:[{id:"d",type:"task.create",confidence:.9,sourceReferences:["capture:day"],arguments:{title:"Submit",dueAt:"2026-08-14",project:"Inbox",linkedActionId:null}}]},db);
    core.applyCaptureInterpretation("day",db);const event=core.listState(db).events.find(item=>item.title==="Submit");assert.equal(event.allDay,true);assert.equal(event.reminders.length,0);
    // The apply response must expose the auto-created linked event so the client calendar renders it without a refresh.
    core.createCapture({id:"reveal",text:"Meet",source:"typed"},db);
    core.saveInterpretation("reveal",{schemaVersion:1,summary:"Meet",clarifications:[],actions:[{id:"t2",type:"task.create",confidence:.9,sourceReferences:["capture:reveal"],arguments:{title:"Meet",dueAt:"2026-08-13T09:30:00+07:00",project:"Inbox",linkedActionId:null}}]},db);
    const reveal=core.applyCaptureInterpretation("reveal",db);
    const revealedEvent=reveal.created.find(item=>item.type==="event");
    assert.ok(revealedEvent,"auto-created linked event missing from apply response");
    assert.equal(revealedEvent.object.startAt,"2026-08-13T02:30:00.000Z");
    assert.equal(revealedEvent.object.allDay,false);
    assert.equal(reveal.created.find(item=>item.type==="task").object.eventId,revealedEvent.object.id);
    const audit=core.listAuditEvents(10,db).find(item=>item.objectId==="timed"&&item.action==="apply");core.undoAuditEvent(audit.id,db);assert.equal(core.listState(db).events.some(item=>item.title==="Study"),false);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("AI capture processing proposes a connected vault note",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-ai-vault-")),vaultDir=join(dir,"vault"),jobsDir=join(dir,"jobs");mkdirSync(vaultDir);mkdirSync(jobsDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),vault=await import("../server/vault.mjs"),jobs=await import("../server/jobs.mjs"),{handleInterpretCapture}=await import("../server/worker/handlers/interpret-capture.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id};vault.connectVault({rootPath:vaultDir},workspace.id,db);core.createCapture({id:"c1",text:"Keep this project idea",source:"typed"},db,actor);
    const id=jobs.enqueueJob("interpret-capture",{captureId:"c1"},db,workspace.id),job=jobs.claimJob(["interpret-capture"],60,db);
    await handleInterpretCapture({job,config:{dataDir:dir,dbPath:join(dir,"test.sqlite"),objectsDir:join(dir,"objects"),backupsDir:join(dir,"backups"),pluginsDir:join(dir,"plugins"),codexEnabled:true,codexPath:resolve("test/fixtures/fake-codex.mjs"),jobsDir,timezone:"Asia/Jakarta"},db});
    const capture=db.prepare("SELECT status,error,objects_json FROM captures WHERE id='c1'").get();assert.equal(capture.status,"review",capture.error);const proposal=JSON.parse(capture.objects_json);assert.equal(proposal.actions[0].type,"vault.note.create");
    core.applyCaptureInterpretation("c1",db,actor);assert.equal(existsSync(join(vaultDir,"Ideas/Project Idea.md")),true);const completed=jobs.getJob(id,db);assert.equal(completed.state,"completed");assert.equal(completed.result.captureVersion,2);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("AI capture nests session notes under the existing university tree",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-nest-")),vaultDir=join(dir,"vault"),jobsDir=join(dir,"jobs");mkdirSync(join(vaultDir,"Uni","BINUS"),{recursive:true});mkdirSync(join(vaultDir,"Work","Clients"),{recursive:true});mkdirSync(jobsDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),vault=await import("../server/vault.mjs"),jobs=await import("../server/jobs.mjs"),{handleInterpretCapture}=await import("../server/worker/handlers/interpret-capture.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id};vault.connectVault({rootPath:vaultDir},workspace.id,db);
    core.createCapture({id:"c1",text:"semester 3 mata kuliah network penetration testing first session about information gathering, defining ethical hacking methodology",source:"typed"},db,actor);
    const id=jobs.enqueueJob("interpret-capture",{captureId:"c1"},db,workspace.id),job=jobs.claimJob(["interpret-capture"],60,db);
    await handleInterpretCapture({job,config:{dataDir:dir,dbPath:join(dir,"test.sqlite"),objectsDir:join(dir,"objects"),backupsDir:join(dir,"backups"),pluginsDir:join(dir,"plugins"),codexEnabled:true,codexPath:resolve("test/fixtures/fake-codex.mjs"),jobsDir,timezone:"Asia/Jakarta"},db});
    const capture=db.prepare("SELECT status,error,objects_json FROM captures WHERE id='c1'").get();assert.equal(capture.status,"review",capture.error);
    const proposal=JSON.parse(capture.objects_json),action=proposal.actions.find(item=>item.type==="vault.note.create");
    assert.ok(action,`expected a vault note proposal: ${JSON.stringify(proposal)}`);
    assert.match(action.arguments.relativePath,/^Uni\/BINUS\/Sem3\//);
    assert.match(action.arguments.relativePath,/Kelas\/Session 1\//);
    assert.match(action.arguments.relativePath,/\.md$/);
    core.applyCaptureInterpretation("c1",db,actor);
    assert.equal(existsSync(join(vaultDir,action.arguments.relativePath)),true);
    const state=core.listState(db,workspace.id),reviewed=state.captures.find(item=>item.id==="c1");
    assert.equal(reviewed.objects[0].type,"vault");assert.equal(reviewed.objects[0].detail,action.arguments.relativePath);
    const completed=jobs.getJob(id,db);assert.equal(completed.state,"completed");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("AI capture adapts to alternative university trees (e.g. College/MIT)",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-mit-")),vaultDir=join(dir,"vault"),jobsDir=join(dir,"jobs");mkdirSync(join(vaultDir,"College","MIT"),{recursive:true});mkdirSync(jobsDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),vault=await import("../server/vault.mjs"),jobs=await import("../server/jobs.mjs"),{handleInterpretCapture}=await import("../server/worker/handlers/interpret-capture.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id};vault.connectVault({rootPath:vaultDir},workspace.id,db);
    core.createCapture({id:"c2",text:"semester 3 course network penetration testing first session about information gathering",source:"typed"},db,actor);
    const id=jobs.enqueueJob("interpret-capture",{captureId:"c2"},db,workspace.id),job=jobs.claimJob(["interpret-capture"],60,db);
    await handleInterpretCapture({job,config:{dataDir:dir,dbPath:join(dir,"test.sqlite"),objectsDir:join(dir,"objects"),backupsDir:join(dir,"backups"),pluginsDir:join(dir,"plugins"),codexEnabled:true,codexPath:resolve("test/fixtures/fake-codex.mjs"),jobsDir,timezone:"Asia/Jakarta"},db});
    const capture=db.prepare("SELECT status,error,objects_json FROM captures WHERE id='c2'").get();assert.equal(capture.status,"review",capture.error);
    const proposal=JSON.parse(capture.objects_json),action=proposal.actions.find(item=>item.type==="vault.note.create");
    assert.ok(action,`expected a vault note proposal: ${JSON.stringify(proposal)}`);
    assert.match(action.arguments.relativePath,/^College\/MIT\/Sem3\//);
    core.applyCaptureInterpretation("c2",db,actor);
    assert.equal(existsSync(join(vaultDir,action.arguments.relativePath)),true);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("AI capture produces both checkmarkable task and calendar event for meeting and reminder captures",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-meeting-")),jobsDir=join(dir,"jobs");mkdirSync(jobsDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),jobs=await import("../server/jobs.mjs"),{handleInterpretCapture}=await import("../server/worker/handlers/interpret-capture.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id};
    core.createCapture({id:"c_meet",text:"meeting tomorrow 1 pm",source:"typed"},db,actor);
    const id=jobs.enqueueJob("interpret-capture",{captureId:"c_meet"},db,workspace.id),job=jobs.claimJob(["interpret-capture"],60,db);
    await handleInterpretCapture({job,config:{dataDir:dir,dbPath:join(dir,"test.sqlite"),objectsDir:join(dir,"objects"),backupsDir:join(dir,"backups"),pluginsDir:join(dir,"plugins"),codexEnabled:true,codexPath:resolve("test/fixtures/fake-codex.mjs"),jobsDir,timezone:"Asia/Jakarta"},db});
    const capture=db.prepare("SELECT status,error,objects_json FROM captures WHERE id='c_meet'").get();assert.equal(capture.status,"review",capture.error);
    const proposal=JSON.parse(capture.objects_json);
    const taskAction=proposal.actions.find(a=>a.type==="task.create"),eventAction=proposal.actions.find(a=>a.type==="event.create");
    assert.ok(taskAction,"expected task.create in proposal");
    assert.ok(eventAction,"expected event.create in proposal");
    const result=core.applyCaptureInterpretation("c_meet",db,actor);
    const state=core.listState(db,workspace.id);
    const createdTask=state.tasks.find(t=>t.title.includes("meeting tomorrow 1 pm"));
    const createdEvent=state.events.find(e=>e.title.includes("meeting tomorrow 1 pm"));
    assert.ok(createdTask,"expected checkmarkable task to be created in state");
    assert.ok(createdEvent,"expected calendar event to be created in state");
    assert.equal(createdTask.completed,false);
    assert.equal(createdTask.event_id,createdEvent.id);
    assert.equal(createdEvent.taskId,createdTask.id);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("applied vault notes reconcile folder casing instead of failing",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-capture-case-")),vaultDir=join(dir,"vault");mkdirSync(join(vaultDir,"Uni","BINUS"),{recursive:true});
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),vault=await import("../server/vault.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id},source=vault.connectVault({rootPath:vaultDir},workspace.id,db);
    core.createCapture({id:"c1",text:"Lecture capture",source:"typed"},db,actor);
    core.saveInterpretation("c1",{schemaVersion:1,summary:"File under the existing tree",clarifications:[],actions:[{id:"v1",type:"vault.note.create",confidence:.9,sourceReferences:["capture:c1",`vault:${source.id}`],arguments:{sourceId:source.id,relativePath:"uni/binus/Session 1/Lecture.md",title:"Lecture",content:"# Lecture\n\n",tags:[]}}]},db);
    const applied=core.applyCaptureInterpretation("c1",db,actor);
    assert.equal(applied.created[0].type,"vault-note");assert.equal(applied.created[0].object.relativePath,"Uni/BINUS/Session 1/Lecture.md");
    assert.equal(existsSync(join(vaultDir,"Uni/BINUS/Session 1/Lecture.md")),true);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("dual-created task and event actions link symmetrically",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-dual-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.createCapture({id:"dual",text:"Meeting with prep",source:"typed"},db);
    core.saveInterpretation("dual",{schemaVersion:1,summary:"Dual",clarifications:[],actions:[
      {id:"e",type:"event.create",confidence:.9,sourceReferences:["capture:dual"],arguments:{title:"Prep meeting",startAt:"2026-09-01T02:00:00.000Z",endAt:"2026-09-01T03:00:00.000Z",timezone:"UTC",location:null,reminders:[{offsetMinutes:60}]}},
      {id:"t",type:"task.create",confidence:.9,sourceReferences:["capture:dual"],arguments:{title:"Prepare slides",dueAt:null,project:"Inbox",linkedActionId:"e"}}
    ]},db);
    const result=core.applyCaptureInterpretation("dual",db),state=core.listState(db),task=state.tasks.find(item=>item.title==="Prepare slides"),event=state.events.find(item=>item.title==="Prep meeting");
    assert.ok(task&&event);assert.equal(task.event_id,event.id);assert.equal(event.taskId,task.id);
    assert.equal(result.created.filter(item=>item.type==="event").length,1); // no duplicate auto-event
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("capture proposals are editable with provenance and optimistic concurrency",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-proposal-edit-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.createCapture({id:"edit",text:"Draft task",source:"typed"},db);
    core.saveInterpretation("edit",{schemaVersion:1,summary:"Draft",clarifications:[],actions:[{id:"t",type:"task.create",confidence:.92,sourceReferences:["capture:edit"],arguments:{title:"Draft task",dueAt:null,project:"Inbox",linkedActionId:null}}]},db);
    const current=core.listState(db).captures.find(item=>item.id==="edit");
    const saved=core.updateCaptureProposal("edit",{version:current.version,proposal:{schemaVersion:1,summary:"Draft",clarifications:[],actions:[{id:"t",type:"task.create",confidence:.92,sourceReferences:["capture:edit"],arguments:{title:"Final task",dueAt:null,project:"Work",linkedActionId:null}}]}},db);
    assert.equal(saved.version,current.version+1);assert.equal(saved.proposal.actions[0].arguments.title,"Final task");assert.equal(saved.proposal.actions[0].userEdited,true);
    assert.throws(()=>core.updateCaptureProposal("edit",{version:current.version,proposal:saved.proposal},db),error=>error.status===409&&error.code==="VERSION_CONFLICT");
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("a completed interpretation cannot overwrite a capture changed while AI was running",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-interpret-conflict-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{core.createCapture({id:"race",text:"Original",source:"typed"},db);db.prepare("UPDATE captures SET status='processing' WHERE id='race'").run();core.updateCapture("race","dismissed",1,db);assert.throws(()=>core.saveInterpretation("race",{schemaVersion:1,summary:"Late",clarifications:[],actions:[{id:"t",type:"task.create",confidence:.9,sourceReferences:["capture:race"],arguments:{title:"Late",dueAt:null,project:"Inbox",linkedActionId:null}}]},db,1),error=>error.code==="VERSION_CONFLICT");assert.equal(core.listState(db).captures[0].status,"dismissed")}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("selected capture actions apply atomically and linked pairs cannot be split",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-selected-apply-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.createCapture({id:"selected",text:"Meeting and note",source:"typed"},db);
    core.saveInterpretation("selected",{schemaVersion:1,summary:"Three",clarifications:[],actions:[
      {id:"e",type:"event.create",confidence:.9,sourceReferences:["capture:selected"],arguments:{title:"Meeting",startAt:"2026-09-01T02:00:00.000Z",endAt:"2026-09-01T03:00:00.000Z",timezone:"UTC",location:null,reminders:[]}},
      {id:"t",type:"task.create",confidence:.9,sourceReferences:["capture:selected"],arguments:{title:"Meeting",dueAt:"2026-09-01T02:00:00.000Z",project:"Inbox",linkedActionId:"e"}},
      {id:"n",type:"note.create",confidence:.9,sourceReferences:["capture:selected"],arguments:{title:"Notes",content:"Body",tags:[]}}
    ]},db);
    const version=core.listState(db).captures.find(item=>item.id==="selected").version;
    assert.throws(()=>core.applyCaptureInterpretation("selected",db,null,{version,actionIds:["t"]}),/linked actions must be selected together/i);
    assert.equal(core.listState(db).tasks.length,0);
    const result=core.applyCaptureInterpretation("selected",db,null,{version,actionIds:["n"]});
    assert.equal(result.created.length,1);assert.equal(core.listState(db).notes[0].title,"Notes");assert.equal(core.listState(db).tasks.length,0);
    assert.deepEqual(JSON.parse(db.prepare("SELECT objects_json FROM captures WHERE id='selected'").get().objects_json).actions.map(action=>action.id),["n"]);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("selected apply rejects missing, unknown, and duplicate action ids",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-selected-validation-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.createCapture({id:"validation",text:"Task",source:"typed"},db);core.saveInterpretation("validation",{schemaVersion:1,summary:"One",clarifications:[],actions:[{id:"t",type:"task.create",confidence:.9,sourceReferences:["capture:validation"],arguments:{title:"Task",dueAt:null,project:"Inbox",linkedActionId:null}}]},db);const version=core.listState(db).captures[0].version;
    for(const actionIds of [undefined,[],["missing"],["t","t"]])assert.throws(()=>core.applyCaptureInterpretation("validation",db,null,{version,actionIds}),/action ids|selected action/i);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("auto-apply accepts only one confident unscheduled task",async()=>{
  const {isSimpleAutoApply}=await import("../server/worker/handlers/interpret-capture.mjs"),task=(overrides={})=>({id:"t",type:"task.create",confidence:.9,arguments:{title:"Task",dueAt:null,project:"Inbox",linkedActionId:null},...overrides});
  assert.equal(isSimpleAutoApply({actions:[task()],clarifications:[]}),true);
  for(const proposal of [{actions:[task({confidence:.89})],clarifications:[]},{actions:[task()],clarifications:["When?"]},{actions:[task({arguments:{title:"Task",dueAt:"2026-09-01",project:"Inbox",linkedActionId:null}})],clarifications:[]},{actions:[task(),task({id:"t2"})],clarifications:[]},{actions:[{...task(),type:"note.create"}],clarifications:[]}])assert.equal(isSimpleAutoApply(proposal),false);
});
test("completing a recurring task regenerates its next occurrence",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-recur-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    core.saveTask({id:"chore",title:"Take out trash",dueAt:"2026-08-25T00:00:00.000Z",recurrence:"weekly",completed:false},db);
    const done=core.listState(db).tasks.find(item=>item.id==="chore");
    core.saveTask({...done,id:"chore",title:"Take out trash",dueAt:done.due_at||done.dueAt,recurrence:"weekly",completed:true},db);
    const tasks=core.listState(db).tasks;
    assert.equal(tasks.length,2);
    const next=tasks.find(item=>item.id!=="chore"&&!item.completed);
    assert.ok(next);assert.equal(next.recurrence,"weekly");
    assert.equal(new Date(next.due_at||next.dueAt).getUTCDay(),new Date("2026-09-01T00:00:00.000Z").getUTCDay());
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("tutor inserts carry provenance and vault notes go through the block API",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-tutor-insert-")),vaultDir=join(dir,"vault");mkdirSync(vaultDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),core=await import("../server/core.mjs"),vault=await import("../server/vault.mjs"),skills=await import("../server/skills.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id};
    const connected=vault.connectVault({rootPath:vaultDir},workspace.id,db),created=vault.createVaultNote(connected.id||connected.sourceId,{relativePath:"Notes/Tutor.md",content:"# Tutor\n\nBody"},actor,db);
    const time=new Date().toISOString();
    db.prepare("INSERT INTO tutor_sessions(id,kind,subject_id,subject_title,created_at,updated_at,workspace_id) VALUES('ts','note',?,?,?,?,?)").run(created.noteId,"Tutor.md",time,time,workspace.id);
    db.prepare("INSERT INTO tutor_messages(id,session_id,role,content,provider,created_at) VALUES('q1','ts','user','Why does X hold?','user',?)").run(time);
    db.prepare("INSERT INTO tutor_messages(id,session_id,role,content,citations_json,provider,created_at) VALUES('a1','ts','assistant','Because of Y.','[]','groq-test',?)").run(time);
    const inserted=skills.insertTutorMessage("a1",created.noteId,db,actor);
    assert.equal(inserted.vault,true);
    const blocks=vault.listNoteBlocks(created.noteId,actor,db);
    const insertedBlock=blocks.map(block=>block.markdown).find(markdown=>markdown&&markdown.includes("Because of Y."));
    assert.ok(insertedBlock);
    assert.match(insertedBlock,/\*\*AI answer\*\* · groq-test · \d{4}-\d{2}-\d{2}/);
    assert.match(insertedBlock,/Question: "Why does X hold\?"/);
    assert.throws(()=>skills.insertTutorMessage("a1",created.noteId,db,actor),error=>error.status===409);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("tutor insert lands after the active block when asked",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-tutor-caret-")),vaultDir=join(dir,"vault");mkdirSync(vaultDir);
  const {openDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),vault=await import("../server/vault.mjs"),skills=await import("../server/skills.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id};
    const connected=vault.connectVault({rootPath:vaultDir},workspace.id,db),created=vault.createVaultNote(connected.id||connected.sourceId,{relativePath:"Notes/Caret.md",content:"# Caret\n\nFirst block body"},actor,db);
    vault.saveMarkdownBlock(created.noteId,{markdown:"Second block body"},actor,db);
    const time=new Date().toISOString();
    db.prepare("INSERT INTO tutor_sessions(id,kind,subject_id,subject_title,created_at,updated_at,workspace_id) VALUES('tc','note',?,?,?,?,?)").run(created.noteId,"Caret.md",time,time,workspace.id);
    db.prepare("INSERT INTO tutor_messages(id,session_id,role,content,provider,created_at) VALUES('qc','tc','user','Explain this','user',?)").run(time);
    db.prepare("INSERT INTO tutor_messages(id,session_id,role,content,citations_json,provider,created_at) VALUES('ac','tc','assistant','Placed answer','[]','groq-test',?)").run(time);
    const blocksBefore=vault.listNoteBlocks(created.noteId,actor,db),firstBlock=blocksBefore[0];
    skills.insertTutorMessage("ac",created.noteId,db,actor,firstBlock.id);
    const blocksAfter=vault.listNoteBlocks(created.noteId,actor,db).map(block=>block.markdown||"");
    assert.equal(blocksAfter.indexOf(markdown=>false),-1);
    assert.equal(blocksAfter[1].includes("Placed answer"),true);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("note PDF download embeds rich content and authoritative handwriting blocks",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-note-pdf-")),vaultDir=join(dir,"vault");mkdirSync(vaultDir);
  const fs=await import("node:fs");
  const {getDatabase,closeDatabase}=await import("../server/db.mjs"),auth=await import("../server/auth.mjs"),collaboration=await import("../server/collaboration.mjs"),vault=await import("../server/vault.mjs"),objects=await import("../server/objects.mjs"),inkRaster=await import("../server/ink-raster.mjs"),core=await import("../server/core.mjs"),{load:pdfLoad}=await import("pdf-lib").then(module=>module.PDFDocument),{getDocument,OPS}=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const {notePdf}=await import("../server/note-pdf.mjs");
  const config={dataDir:dir,dbPath:join(dir,"test.sqlite"),objectsDir:join(dir,"objects"),jobsDir:join(dir,"jobs")};
  const db=getDatabase(config);
  fs.mkdirSync(config.objectsDir,{recursive:true});fs.mkdirSync(config.jobsDir,{recursive:true});
  try{
    const user=await auth.ensureOwner({email:"owner@example.com",password:"correct horse battery staple"},db),workspace=collaboration.ensureDefaultWorkspace(user.id,db),actor={id:user.id,workspaceId:workspace.id};
    const connected=vault.connectVault({rootPath:vaultDir},workspace.id,db);
    const created=vault.createVaultNote(connected.id||connected.sourceId,{relativePath:"Export.md",content:"# Export\n\nIntro paragraph.\n\n$$\\alpha + \\beta \\geq 1$$\n"},actor,db);
    const png=inkRaster.strokesToPng({width:40,height:40,strokes:[{tool:"pen",color:"#111827",width:2,points:[{x:1,y:1},{x:30,y:30}]}]});
    const asset=await objects.storeAsset({stream:require("node:stream").Readable.from([png]),name:"diagram.png",mime:"image/png"},config,db,workspace.id);
    const content="![1.00]()\n\n# Export\n\nIntro paragraph.\n\n$$\\alpha + \\beta \\geq 1$$\n\n"+Array(19).fill("<br />").join("\n\n")+"\n\n![diagram](/api/v1/assets/"+asset.id+")",markdown=vault.listNoteBlocks(created.noteId,actor,db)[0];
    vault.saveMarkdownBlock(created.noteId,{id:markdown.id,markdown:content,version:markdown.version},actor,db);
    vault.saveInkBlock(created.noteId,{formatVersion:2,coordinateSpace:"world",width:810,height:595,strokes:[{id:"s1",tool:"pen",color:"#123456",width:3,points:[{x:10,y:10,pressure:.5,time:0},{x:750,y:500,pressure:.5,time:1}]},{id:"s2",tool:"pen",color:"#654321",width:3,points:[{x:400,y:300,pressure:.5,time:2}]}]},actor,db);
    core.saveNote({id:created.noteId,content,version:db.prepare("SELECT version FROM notes WHERE id=?").get(created.noteId).version},db,actor);
    const result=await notePdf(created.noteId,undefined,workspace.id,config);
    const pdf=await pdfLoad(result.bytes);
    assert.equal(pdf.getPageCount(),1,"editor line breaks should not push handwriting onto a hidden second page");
    assert.ok(result.bytes.length>1200,"export should carry embedded image weight");
    const rendered=await getDocument({data:new Uint8Array(result.bytes)}).promise,page=await rendered.getPage(1),operators=await page.getOperatorList(),textItems=(await page.getTextContent()).items.map(item=>item.str||""),text=textItems.join(" ");
    assert.equal(textItems.filter(item=>item==="Export").length,1,"the note title should not be duplicated");
    assert.doesNotMatch(text,/<br\s*\/?\s*>|\[image:\s*1\.00\]/i);
    assert.ok(operators.fnArray.includes(OPS.paintImageXObject),"exported PDF should contain the saved image");
    const inkColor=operators.fnArray.findIndex((fn,index)=>fn===OPS.setStrokeRGBColor&&operators.argsArray[index]?.[0]==="#123456"),inkPath=operators.fnArray.indexOf(OPS.constructPath,inkColor);
    assert.ok(inkColor>=0&&inkPath>inkColor&&operators.argsArray[inkPath]?.[0]===OPS.stroke,"exported PDF should contain the saved handwriting stroke");
    assert.ok(operators.fnArray.some((fn,index)=>fn===OPS.setStrokeRGBColor&&operators.argsArray[index]?.[0]==="#654321"),"single-point pen marks should remain visible");
  }finally{closeDatabase();rmSync(dir,{recursive:true,force:true})}
});
test("parallel tutor answers require at least two distinct providers",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"noema-tutor-parallel-")),{openDatabase}=await import("../server/db.mjs"),core=await import("../server/core.mjs"),skills=await import("../server/skills.mjs"),db=openDatabase(join(dir,"test.sqlite"));
  try{
    const time=new Date().toISOString();
    db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES('u','p@example.com','x',?,?)").run(time,time);
    db.prepare("INSERT INTO workspaces(id,name,created_by,created_at,updated_at) VALUES('w','W','u',?,?)").run(time,time);
    const note=core.saveNote({title:"Parallel note",content:"# Parallel"},db,{id:"u",workspaceId:"w"});
    await assert.rejects(
      ()=>skills.runTutorParallel({kind:"note",id:note.id,question:"hi"},{dataDir:dir,jobsDir:dir,databasePath:join(dir,"t.sqlite"),geminiApiKey:"only-gemini",appEncryptionKey:"x".repeat(40)},db,"w"),
      error=>error.status===409&&/at least two/i.test(error.message)
    );
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
