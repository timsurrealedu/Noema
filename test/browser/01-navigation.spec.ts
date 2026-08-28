import {expect,test} from "@playwright/test";
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

test("primary product routes render without runtime errors",async({page})=>{
  test.setTimeout(90_000);
  const failures:string[]=[];let route="/login";
  page.on("pageerror",error=>failures.push(`${route}: ${error.message}`));
  page.on("console",message=>{if(message.type()==="error")failures.push(`${route}: ${message.text()}`)});
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await expect(page).toHaveURL("/");
  for(route of ["/","/capture","/tasks","/calendar","/vault","/canvas","/coding","/study","/projects","/graph","/automations","/settings"]){
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }
  expect(failures).toEqual([]);
});

test("Home uses the shared mobile navigation and More menu",async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  const navigation=page.getByRole("navigation",{name:"Mobile navigation"});
  await expect(navigation.getByRole("link")).toHaveText(["Home","Capture","Vault","Calendar"]);
  await expect(navigation.getByRole("link",{name:"Coding"})).toHaveCount(0);
  await navigation.getByRole("button",{name:"More"}).click();
  await expect(page.getByRole("dialog",{name:"More navigation"})).toBeVisible();
});

test("mobile back from a note returns to its vault folder",async({page})=>{
  const vault=mkdtempSync(join(tmpdir(),"noema-vault-back-")),folder=join(vault,"Projects");
  mkdirSync(folder);writeFileSync(join(folder,"Mobile back.md"),"# Mobile back\n");
  try{
    await page.setViewportSize({width:390,height:844});
    await page.goto("/login");
    await page.getByLabel("Email address").fill("owner@example.com");
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button",{name:"Continue securely"}).click();
    await expect(page).toHaveURL("/");
    await page.evaluate(async rootPath=>{
      const response=await fetch("/api/v1/vault-sources",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rootPath,name:"Back gesture vault"})});
      if(!response.ok)throw new Error(await response.text());
      const source=await response.json();
      const sync=await fetch(`/api/v1/vault-sources/${source.id}/sync`,{method:"POST"});
      if(!sync.ok)throw new Error(await sync.text());
    },vault);
    await page.goto("/vault?folder=Projects");
    const note=page.getByRole("button",{name:"Mobile back Projects/Mobile back.md",exact:true});
    await note.click();
    await expect(page).toHaveURL(/\/vault\?folder=Projects&open=/);
    await page.goBack();
    await expect(page).toHaveURL(/\/vault\?folder=Projects$/);
    await expect(page.getByRole("heading",{name:"Projects"})).toBeVisible();
    await expect(note).toBeVisible();
  }finally{rmSync(vault,{recursive:true,force:true})}
});

test("Home desktop keeps Coding inside More and Settings owns theme switching",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  const sidebar=page.locator(".app-shell > .sidebar");
  await expect(sidebar.getByRole("link",{name:"Coding"})).toHaveCount(0);
  await sidebar.getByRole("button",{name:"More"}).click();
  await expect(page.getByRole("dialog",{name:"More navigation"}).getByRole("link",{name:"Coding"})).toBeVisible();
  await page.goto("/settings");
  await expect(page.locator(".theme-toggle")).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Switch to (light|dark)/})).toBeVisible();
});

test("module desktop navigation keeps Coding inside More",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await page.goto("/tasks");
  const sidebar=page.locator(".module-shell > .sidebar");
  await expect(sidebar.getByRole("link",{name:"Coding"})).toHaveCount(0);
  await sidebar.getByRole("button",{name:"More"}).click();
  await expect(page.getByRole("dialog",{name:"More navigation"}).getByRole("link",{name:"Coding"})).toBeVisible();
});

test("desktop capture gives the list and inspector independent scroll regions",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await page.goto("/capture");
  const styles=await page.locator(".capture-inspector").evaluate(element=>{const style=getComputedStyle(element);return {position:style.position,height:style.height,overflowY:style.overflowY}});
  expect(styles).toMatchObject({position:"static",overflowY:"auto"});
  expect(Number.parseFloat(styles.height)).toBeGreaterThan(0);
  const listStyles=await page.locator(".capture-list-pane").evaluate(element=>{const style=getComputedStyle(element);return {overflowY:style.overflowY}});
  expect(listStyles.overflowY).toBe("auto");
  const toolbar=await page.locator(".capture-queue-toolbar").evaluate(element=>{const style=getComputedStyle(element);return {zIndex:style.zIndex,background:style.backgroundColor}});
  expect(toolbar).toMatchObject({zIndex:"20",background:"rgb(29, 32, 33)"});
});
