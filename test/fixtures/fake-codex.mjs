#!/usr/bin/env node

let prompt="";process.stdin.on("data",chunk=>prompt+=chunk);process.stdin.on("end",()=>{
  const vault=prompt.match(/Source ID: vault:([^\n]+)/),foldersBlock=prompt.match(/Folders \(\d+\):\n((?:[^\n]+\/\n?)+)/),folders=foldersBlock?foldersBlock[1].split("\n").map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/\/$/,"")):[];
  // Only inspect the capture text itself (the instructions contain example paths).
  const captureIdMatch=prompt.match(/Source ID: capture:([^\n]+)/);
  const captureId=captureIdMatch?captureIdMatch[1]:"c1";
  const captureText=(prompt.match(/Capture:\n([\s\S]*)$/)||[])[1]||"";
  const pick=segment=>folders.find(folder=>folder.toLowerCase().endsWith(segment.toLowerCase())||folder.toLowerCase().includes(segment.toLowerCase()));
  let result;
  const isStudyOrNote=/(semester|mata kuliah|session|course|lecture|note|about|idea|project)/i.test(captureText);
  if(vault && isStudyOrNote){
    const semester=captureText.match(/semester\s*(\d+)/i),sessionWord=captureText.match(/(first|second|third|\d+(?:st|nd|rd|th)?)\s+session/i),session=captureText.match(/session\s*(\d+)/i),course=captureText.match(/(?:mata kuliah|course)\s+([^\n,.]+?)(?=\s+(?:first|second|third|session|\d))/i),topic=captureText.match(/about\s+([^\n,.]+)/i);
    let relativePath="Ideas/Project Idea.md";
    if(semester||session||sessionWord||course){
      const base=pick("uni/binus")||pick("college/mit")||pick("university")||pick("study")||folders[0]||"Uni/Binus";
      const parts=[base];
      if(semester)parts.push(`Sem${semester[1]}`);
      if(course)parts.push(course[1].trim());
      parts.push("Kelas");
      if(session)parts.push(`Session ${session[1]}`);
      else if(sessionWord)parts.push(`Session ${{first:1,second:2,third:3}[sessionWord[1].toLowerCase()]||parseInt(sessionWord[1])||1}`);
      const noteName=topic?topic[1].trim():"Information Gathering";
      relativePath=`${parts.filter(Boolean).join("/")}/${noteName}.md`;
    }
    result={schemaVersion:1,summary:"Save a nested vault note",actions:[{id:"vault-1",type:"vault.note.create",confidence:.99,sourceReferences:[`capture:${captureId}`,`vault:${vault[1]}`],arguments:{sourceId:vault[1],relativePath,title:topic?topic[1].trim():"Session note",content:"# Session note\n\nInformation gathering and ethical hacking methodology\n",tags:["uni"]}}],clarifications:[]};
  }else{
    const isMeetingOrReminder=/(meeting|remind|schedule|tomorrow|appointment|call|at\s+\d|pm|am)/i.test(captureText);
    if(isMeetingOrReminder){
      result={schemaVersion:1,summary:"Create task and event",actions:[
        {id:"task-1",type:"task.create",confidence:.99,sourceReferences:[`capture:${captureId}`],arguments:{title:captureText.trim()||"Tomorrow meeting 1 pm",dueAt:"2026-08-28T06:00:00.000Z",project:"Inbox",linkedActionId:"event-1"}},
        {id:"event-1",type:"event.create",confidence:.99,sourceReferences:[`capture:${captureId}`],arguments:{title:captureText.trim()||"Tomorrow meeting 1 pm",startAt:"2026-08-28T06:00:00.000Z",endAt:"2026-08-28T07:00:00.000Z",timezone:"Asia/Jakarta",location:null,reminders:[{offsetMinutes:60},{offsetMinutes:30}]}}
      ],clarifications:[]};
    }else{
      result={schemaVersion:1,summary:"Create a review task",actions:[{id:"task-1",type:"task.create",confidence:.99,sourceReferences:[`capture:${captureId}`],arguments:{title:"Plan the browser-tested release",dueAt:null,project:"Inbox",linkedActionId:null}}],clarifications:[]};
    }
  }
  process.stdout.write(`${JSON.stringify({type:"item.completed",item:{type:"agent_message",text:JSON.stringify(result)}})}\n`);
});

