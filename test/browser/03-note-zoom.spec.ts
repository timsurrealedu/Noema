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
    const entry=await fetch(`/api/v1/vault-sources/${source.id}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({relativePath:`Zoom verification ${Date.now()}.md`})});
    const entryText=await entry.text();
    if(!entry.ok) return {error:"entry failed",status:entry.status,entryText};
    return {noteId:JSON.parse(entryText).noteId};
  }, join(process.cwd(),"test","fixtures","zoom-vault-repo"));
  console.log("RESULT",JSON.stringify(result));
  expect(result.noteId,"vault note create").toBeTruthy();
  await page.goto("/vault");
  await page.locator(".vault-file-card button",{hasText:"Zoom verification"}).first().click();
  const editor=page.locator(".mixed-note-editor");
  await expect(editor).toBeVisible({timeout:30_000});
  await expect(page.getByRole("button",{name:"Insert ink"}).first()).toBeAttached();
  const docPage=page.locator(".integrated-doc-page").last();
  await page.hover(".markdown-block-editor");
  await docPage.evaluate(()=>{
    const container=document.querySelector(".integrated-doc-container")!;
    const rect=container.getBoundingClientRect();
    for(let i=0;i<3;i++) container.dispatchEvent(new WheelEvent("wheel",{deltaY:-120,ctrlKey:true,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,bubbles:true,cancelable:true}));
  });
  await expect.poll(()=>docPage.evaluate(el=>Number(el.style.zoom)||1)).toBeGreaterThan(1.2);
  const zoomed=await docPage.evaluate(el=>({zoom:Number(el.style.zoom),rectW:el.getBoundingClientRect().width,offsetW:(el as HTMLElement).offsetWidth}));
  expect(Math.abs(zoomed.rectW-zoomed.offsetW*zoomed.zoom)).toBeLessThan(2);
  // Draw a stroke while zoomed: stored coordinates must stay in unzoomed layout units.
  await page.locator(".ink-mode-toggle").click();
  const overlay=page.locator(".integrated-ink-overlay");
  await expect(overlay).toBeVisible();
  const box=await overlay.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x+box!.width*0.3,box!.y+box!.height*0.4);
  await page.mouse.down();
  await page.mouse.move(box!.x+box!.width*0.6,box!.y+box!.height*0.5,{steps:8});
  await page.mouse.up();
  const strokeCheck=await page.evaluate(async noteId=>{
    for(let attempt=0;attempt<30;attempt++){
      await new Promise(resolve=>setTimeout(resolve,500));
      const data=await (await fetch(`/api/v1/notes/${noteId}/blocks`)).json();
      const ink=(data.blocks||[]).find((block:{kind:string})=>block.kind==="ink");
      if(ink?.strokes?.length) return {width:ink.width,height:ink.height,maxX:Math.max(...ink.strokes.flatMap((s:{points:{x:number}[]})=>s.points.map((p:{x:number})=>p.x)))};
    }
    const debug=await (await fetch(`/api/v1/notes/${noteId}/blocks`)).json();
    console.log("BLOCKS_DEBUG",JSON.stringify(debug.blocks?.map((block:{id:string;kind:string;ocrStatus:string})=>({id:block.id,kind:block.kind,ocr:block.ocrStatus}))));
    return null;
  },result.noteId);
  expect(strokeCheck,"stroke persisted").toBeTruthy();
  expect(strokeCheck!.maxX).toBeLessThanOrEqual(strokeCheck!.width+1);
  await page.locator("summary[aria-label='More note options']").click();
  await expect(page.getByText(/Reset zoom/)).toBeVisible();
  await page.getByRole("button",{name:/Reset zoom/}).click();
  await expect.poll(()=>docPage.evaluate(el=>Number(el.style.zoom)||1)).toBe(1);
});
