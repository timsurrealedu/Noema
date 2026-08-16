#!/usr/bin/env node

let prompt="";process.stdin.on("data",chunk=>prompt+=chunk);process.stdin.on("end",()=>{
  const vault=prompt.match(/Source ID: vault:([^\n]+)/),result=vault?{schemaVersion:1,summary:"Save a vault note",actions:[{id:"vault-1",type:"vault.note.create",confidence:.99,sourceReferences:["capture:c1",`vault:${vault[1]}`],arguments:{sourceId:vault[1],relativePath:"Ideas/Project Idea.md",title:"Project Idea",content:"# Project Idea\n\nKeep this project idea\n",tags:["ideas"]}}],clarifications:[]}:{schemaVersion:1,summary:"Create a review task",actions:[{id:"task-1",type:"task.create",confidence:.99,sourceReferences:[],arguments:{title:"Plan the browser-tested release",dueAt:null,project:"Inbox",linkedActionId:null}}],clarifications:[]};
  process.stdout.write(`${JSON.stringify({type:"item.completed",item:{type:"agent_message",text:JSON.stringify(result)}})}\n`);
});
