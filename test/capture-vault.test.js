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
    assert.equal(applied.created.length,1);assert.equal(existsSync(join(vaultDir,"Ideas/Project Idea.md")),true);assert.equal(readFileSync(join(vaultDir,"Ideas/Project Idea.md"),"utf8"),"# Project Idea\n\nKeep this project idea\n");
    const event=core.listAuditEvents(10,db,workspace.id).find(item=>item.action==="apply");core.undoAuditEvent(event.id,db,actor);
    assert.equal(existsSync(join(vaultDir,"Ideas/Project Idea.md")),false);
  }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});

test("vault proposals must cite their connected vault target",async()=>{
  const {validateProposal}=await import("../server/worker/handlers/interpret-capture.mjs"),proposal={schemaVersion:1,summary:"Save it",clarifications:[],actions:[{id:"vault-1",type:"vault.note.create",confidence:.9,sourceReferences:["capture:c1"],arguments:{sourceId:"source-1",relativePath:"Ideas/Idea.md",title:"Idea",content:"# Idea",tags:[]}}]};
  assert.throws(()=>validateProposal(proposal,new Set(["capture:c1","vault:source-1"])),/cite its target vault source/);
  proposal.actions[0].sourceReferences.push("vault:source-1");assert.equal(validateProposal(proposal,new Set(["capture:c1","vault:source-1"])),proposal);
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
    core.applyCaptureInterpretation("timed",db);const timed=core.listState(db);assert.equal(timed.tasks[0].reminderAt,null);assert.equal(timed.events[0].endAt,"2026-08-13T04:00:00.000Z");assert.equal(timed.events[0].taskId,timed.tasks[0].id);
    const expectedReminders=(await import("../server/settings.mjs")).reminderOffsets().length;assert.equal(db.prepare("SELECT COUNT(*) count FROM event_reminders WHERE event_id=?").get(timed.events[0].id).count,expectedReminders);
    core.createCapture({id:"day",text:"Submit",source:"typed"},db);
    core.saveInterpretation("day",{schemaVersion:1,summary:"Submit",clarifications:[],actions:[{id:"d",type:"task.create",confidence:.9,sourceReferences:["capture:day"],arguments:{title:"Submit",dueAt:"2026-08-14",project:"Inbox",linkedActionId:null}}]},db);
    core.applyCaptureInterpretation("day",db);const event=core.listState(db).events.find(item=>item.title==="Submit");assert.equal(event.allDay,true);assert.equal(event.reminders.length,0);
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
