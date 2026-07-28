#!/usr/bin/env node

process.stdin.resume();
process.stdin.on("end",()=>{
  const result={schemaVersion:1,summary:"Create a review task",actions:[{id:"task-1",type:"task.create",confidence:.99,sourceReferences:["Plan the browser-tested release"],arguments:{title:"Plan the browser-tested release",dueAt:null,project:"Inbox",linkedActionId:null}}],clarifications:[]};
  process.stdout.write(`${JSON.stringify({type:"item.completed",item:{type:"agent_message",text:JSON.stringify(result)}})}\n`);
});
