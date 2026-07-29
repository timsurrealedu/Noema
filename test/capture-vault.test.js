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
  assert.equal(text.includes("additionalProperties"),false);assert.equal(text.includes("oneOf"),false);assert.equal(text.includes("anyOf"),false);assert.equal(schema.properties.schemaVersion.type,"integer");assert.equal(schema.properties.schemaVersion.enum,undefined);assert.deepEqual(schema.properties.actions.items.properties.type.enum,["task.create","event.create","note.create","vault.note.create"]);
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
