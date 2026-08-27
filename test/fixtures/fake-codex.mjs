#!/usr/bin/env node

let prompt="";process.stdin.on("data",chunk=>prompt+=chunk);process.stdin.on("end",()=>{
  const vault=prompt.match(/Source ID: vault:([^\n]+)/),foldersBlock=prompt.match(/Folders \(\d+\):\n((?:[^\n]+\/\n?)+)/),folders=foldersBlock?foldersBlock[1].split("\n").map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/\/$/,"")):[];
  // Only inspect the capture text itself (the instructions contain example paths).
  const captureText=(prompt.match(/Capture:\n([\s\S]*)$/)||[])[1]||"";
  const pick=segment=>folders.find(folder=>folder.toLowerCase().endsWith(segment.toLowerCase()));
  let result;
  if(vault){
    // Folder-aware placement: extend the closest existing branch (e.g. Uni/BINUS) with
    // semester/course/session nesting implied by the capture text; generic captures
    // keep the classic flat destination.
    const semester=captureText.match(/semester\s*(\d+)/i),sessionWord=captureText.match(/(first|second|third|\d+(?:st|nd|rd|th)?)\s+session/i),session=captureText.match(/session\s*(\d+)/i),course=captureText.match(/mata kuliah\s+([^\n,.]+?)(?=\s+(?:first|second|third|session|\d))/i),topic=captureText.match(/about\s+([^\n,.]+)/i);
    let relativePath="Ideas/Project Idea.md";
    if(semester||session||sessionWord){
      const base=pick("uni/binus")||pick("university")||pick("study")||folders[0]||"";
      const parts=[base];
      if(semester)parts.push(`Sem${semester[1]}`);
      if(course)parts.push(course[1].trim());
      parts.push("Kelas");
      if(session)parts.push(`Session ${session[1]}`);
      else if(sessionWord)parts.push(`Session ${{first:1,second:2,third:3}[sessionWord[1].toLowerCase()]||parseInt(sessionWord[1])||1}`);
      const noteName=topic?topic[1].trim():"Note";
      relativePath=`${parts.filter(Boolean).join("/")}/${noteName}.md`;
    }
    result={schemaVersion:1,summary:"Save a nested vault note",actions:[{id:"vault-1",type:"vault.note.create",confidence:.99,sourceReferences:["capture:c1",`vault:${vault[1]}`],arguments:{sourceId:vault[1],relativePath,title:"Session note",content:"# Session note\n\nInformation gathering and ethical hacking methodology\n",tags:["uni"]}}],clarifications:[]};
  }else{
    result={schemaVersion:1,summary:"Create a review task",actions:[{id:"task-1",type:"task.create",confidence:.99,sourceReferences:[],arguments:{title:"Plan the browser-tested release",dueAt:null,project:"Inbox",linkedActionId:null}}],clarifications:[]};
  }
  process.stdout.write(`${JSON.stringify({type:"item.completed",item:{type:"agent_message",text:JSON.stringify(result)}})}\n`);
});
