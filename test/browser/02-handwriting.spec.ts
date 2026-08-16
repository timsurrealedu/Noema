import {expect,test} from "@playwright/test";
import {mkdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

test("Today handwriting creates, draws, saves quick note, and queues processing",async({page})=>{
  test.setTimeout(60_000);
  const vaultDir=join(tmpdir(),`noema-ink-test-${Date.now()}`);
  mkdirSync(vaultDir,{recursive:true});

  try{
    await page.goto("/login");
    await page.getByLabel("Email address").fill("owner@example.com");
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button",{name:"Continue securely"}).click();
    await expect(page).toHaveURL("/");

    await page.evaluate(async(rootPath)=>{
      const response=await fetch("/api/v1/vault-sources",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({rootPath,name:"Capture Vault"})
      });
      if(!response.ok)throw new Error(await response.text());
    },vaultDir);

    await page.getByRole("button",{name:"Write a handwritten note"}).click();
    await expect(page.getByRole("dialog",{name:"Create handwritten note"})).toBeVisible();

    const canvas=page.getByRole("img",{name:"Pressure-aware handwriting canvas"});
    await expect(canvas).toBeVisible();
    const box=await canvas.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x+100,box!.y+100);
    await page.mouse.down();
    await page.mouse.move(box!.x+300,box!.y+200,{steps:10});
    await page.mouse.up();

    const doneButton=page.getByRole("button",{name:"Done"});
    await expect(doneButton).toBeEnabled();
    await doneButton.click();

    await expect(page.getByText("Handwriting saved",{exact:true})).toBeVisible();
    await expect(page.getByText("Queued for the next Process Inbox run.",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Close"}).click();
    await expect(page.getByRole("dialog",{name:"Create handwritten note"})).toBeHidden();

    await expect.poll(()=>page.evaluate(async()=>fetch("/api/v1/state").then(res=>res.json()).then(state=>state.captures.some((c:{source:string;status:string})=>c.source==="handwriting"&&c.status==="queued")))).toBe(true);
  }finally{
    rmSync(vaultDir,{recursive:true,force:true});
  }
});
