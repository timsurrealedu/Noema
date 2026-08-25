import {expect,test} from "@playwright/test";
import {join} from "node:path";

test("note page wheel zoom keeps layout coherent and insert handle reachable",async({page})=>{
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await expect(page).toHaveURL("/");
  const result = await page.evaluate(async rootPath=>{
    const connected=await fetch("/api/v1/vault-sources",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rootPath,name:"Zoom vault"})});
    const sourceText=await connected.text();
    if(!connected.ok) return {error:"connect failed",status:connected.status,sourceText};
    const source=JSON.parse(sourceText);
    const title=`Zoom verification ${Date.now()}`;
    const entry=await fetch(`/api/v1/vault-sources/${source.id}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath:`${title}.md`})});
    const entryText=await entry.text();
    if(!entry.ok) return {error:"entry failed",status:entry.status,entryText};
    return {noteId:JSON.parse(entryText).noteId,title};
  }, join(process.cwd(),"test","fixtures","zoom-vault-repo"));
  console.log("RESULT",JSON.stringify(result));
  expect(result.noteId,"vault note create").toBeTruthy();
  await page.goto("/vault");
  const newNote=page.getByRole("button",{name:"New note",exact:true});
  await expect(newNote).toBeEnabled();
  await newNote.focus();
  await page.keyboard.press("Enter");
  const newNoteDialog=page.getByRole("dialog",{name:"New note"});
  await expect(newNoteDialog.getByLabel("Note name")).toBeVisible();
  await newNoteDialog.getByRole("button",{name:"Cancel"}).click();
  await page.locator(".vault-file-card button",{hasText:result.title}).click();
  const editor=page.locator(".mixed-note-editor");
  await expect(editor).toBeVisible({timeout:30_000});
  await expect(page.getByRole("button",{name:"Insert ink"}).first()).toBeAttached();
  const docPage=page.locator(".integrated-doc-page").last();
  await page.hover(".markdown-block-editor");
  await docPage.evaluate(()=>{
    const container=document.querySelector(".integrated-doc-container")!;
    const rect=container.getBoundingClientRect();
    for(let i=0;i<18;i++) container.dispatchEvent(new WheelEvent("wheel",{deltaY:-120,ctrlKey:true,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,bubbles:true,cancelable:true}));
  });
  await expect.poll(()=>docPage.evaluate(el=>Number(el.style.zoom)||1)).toBeGreaterThan(4);
  const zoomed=await docPage.evaluate(el=>({zoom:Number(el.style.zoom),rectW:el.getBoundingClientRect().width,offsetW:(el as HTMLElement).offsetWidth}));
  expect(Math.abs(zoomed.rectW-zoomed.offsetW*zoomed.zoom)).toBeLessThan(zoomed.zoom);
  // Draw a stroke while zoomed: stored coordinates must stay in unzoomed layout units.
  await page.locator(".ink-mode-toggle").click();
  const overlay=page.locator(".integrated-ink-overlay");
  await expect(overlay).toBeVisible();
  const box=await overlay.boundingBox();
  expect(box).toBeTruthy();
  const viewport=page.viewportSize()!;
  const startX=Math.max(box!.x+20,Math.min(box!.x+box!.width-140,viewport.width/2));
  const startY=Math.max(box!.y+20,Math.min(box!.y+box!.height-80,viewport.height/2));
  await page.mouse.move(startX,startY);
  await page.mouse.down();
  await page.mouse.move(startX+120,startY+40,{steps:8});
  await page.mouse.up();
  const strokeCheck=await page.evaluate(async noteId=>{
    for(let attempt=0;attempt<30;attempt++){
      await new Promise(resolve=>setTimeout(resolve,500));
      const data=await (await fetch(`/api/v1/notes/${noteId}/blocks`)).json();
      const ink=(data.blocks||[]).find((block:{kind:string})=>block.kind==="ink");
      if(ink?.strokes?.length) return {id:ink.id,width:ink.width,height:ink.height,strokeWidth:ink.strokes[0].width,maxX:Math.max(...ink.strokes.flatMap((s:{points:{x:number}[]})=>s.points.map((p:{x:number})=>p.x)))};
    }
    const debug=await (await fetch(`/api/v1/notes/${noteId}/blocks`)).json();
    console.log("BLOCKS_DEBUG",JSON.stringify(debug.blocks?.map((block:{id:string;kind:string;ocrStatus:string})=>({id:block.id,kind:block.kind,ocr:block.ocrStatus}))));
    return null;
  },result.noteId);
  expect(strokeCheck,"stroke persisted").toBeTruthy();
  expect(strokeCheck!.maxX).toBeLessThanOrEqual(strokeCheck!.width+1);
  expect(strokeCheck!.strokeWidth).toBeLessThan(1);
  await expect(overlay.locator("path").last()).toHaveAttribute("d",/Q/);
  const advanced=await page.evaluate(async({noteId,blockId})=>{
    for(let attempt=0;attempt<10;attempt++){
      const blocks=await (await fetch(`/api/v1/notes/${noteId}/blocks`)).json();
      const ink=(blocks.blocks||[]).find((block:{id:string})=>block.id===blockId);
      const response=await fetch(`/api/v1/ink/${blockId}/transcript`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript:ink.transcript||"",equations:ink.equations||[],version:ink.inkVersion})});
      if(response.ok)return true;
      if(response.status!==409)return false;
    }
    return false;
  },{noteId:result.noteId,blockId:strokeCheck!.id});
  expect(advanced,"server version advanced outside the drawing editor").toBe(true);
  await page.mouse.move(startX,startY+30);
  await page.mouse.down();
  await page.mouse.move(startX+100,startY+70,{steps:8});
  await page.mouse.up();
  await expect.poll(async()=>page.evaluate(async noteId=>{
    const data=await (await fetch(`/api/v1/notes/${noteId}/blocks`)).json();
    return (data.blocks||[]).find((block:{kind:string})=>block.kind==="ink")?.strokes?.length||0;
  },result.noteId)).toBeGreaterThanOrEqual(2);
  expect((await page.locator(".tutor-error").allTextContents()).join(" ")).not.toContain("Expected version");
  await page.locator("summary[aria-label='More note options']").click();
  await expect(page.getByText(/Reset zoom/)).toBeVisible();
  await page.getByRole("button",{name:/Reset zoom/}).click();
  await expect.poll(()=>docPage.evaluate(el=>Number(el.style.zoom)||1)).toBe(1);
});
