import AxeBuilder from "@axe-core/playwright";
import {createHmac} from "node:crypto";
import {expect,test,type Page} from "@playwright/test";

const routes=["/","/capture","/tasks","/calendar","/vault","/graph","/projects","/study","/coding","/coding/compiler","/automations","/dashboards","/plugins","/collaboration","/notifications","/activity","/settings","/help"];

async function login(page:Page){
  await page.goto("/login");await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();await expect(page).toHaveURL("/");
}
function totp(secret:string){const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bytes:number[]=[];let bits=0,value=0;for(const char of secret){value=(value<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bytes.push(value>>>(bits-8)&255);bits-=8}}const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30_000)));const digest=createHmac("sha1",Buffer.from(bytes)).update(counter).digest(),offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1_000_000).padStart(6,"0")}
async function verifyRecentMfa(page:Page){const secret=await page.evaluate(async()=>{const response=await fetch("/api/v1/auth/totp",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),body=await response.json();if(!response.ok)throw new Error(body.error?.message);return body.secret}),code=totp(secret);await page.evaluate(async code=>{const response=await fetch("/api/v1/auth/totp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});if(!response.ok)throw new Error(await response.text())},code)}

test("primary routes work at desktop and mobile widths",async({page})=>{
  test.setTimeout(240_000);await login(page);
  for(const width of [1440,375])for(const route of routes){
    await page.setViewportSize({width,height:900});await page.goto(route);await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${route} overflows at ${width}px`).toBe(true);
  }
});

test("primary surfaces pass automated WCAG 2.2 AA rules",async({page})=>{
  test.setTimeout(120_000);await login(page);
  for(const route of ["/","/capture","/tasks","/calendar","/vault","/graph","/dashboards","/plugins","/collaboration","/settings","/login","/join"]){
    await page.goto(route);const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
    expect(result.violations,`${route}: ${result.violations.map(item=>item.id).join(", ")}`).toEqual([]);
  }
});

test("keyboard focus stays trapped and core layouts tolerate 200% text",async({page})=>{
  test.setTimeout(90_000);await login(page);
  await page.getByRole("button",{name:/Search/}).click();const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();
  for(let index=0;index<12;index++)await page.keyboard.press("Tab");
  expect(await page.evaluate(()=>!!document.activeElement?.closest("dialog"))).toBe(true);
  await page.keyboard.press("Escape");await expect(dialog).toBeHidden();
  await page.setViewportSize({width:1280,height:900});
  for(const route of ["/","/capture","/tasks","/calendar","/vault","/settings"]){
    await page.goto(route);await page.evaluate(()=>document.documentElement.style.fontSize="200%");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${route} overflows at 200% text`).toBe(true);
  }
});

test("automation builder composes, previews, runs, and exposes step history",async({page})=>{
  await login(page);await page.goto("/automations");await page.getByRole("button",{name:"New automation"}).click();
  await page.getByLabel("Name").fill("Browser workflow");await page.getByRole("button",{name:"Add condition"}).click();
  await page.getByLabel("Condition 1 value").fill("browser");await page.getByLabel("Title").fill("First step");
  await page.getByRole("button",{name:"Add action"}).click();await page.getByLabel("Title").nth(1).fill("Second step");
  await page.getByRole("button",{name:"Preview"}).click();await expect(page.getByText("Create notification: First step → Create notification: Second step")).toBeVisible();
  await page.getByRole("button",{name:"Remove condition 1"}).click();
  await page.getByRole("button",{name:"Create automation"}).click();await page.getByRole("button",{name:/Browser workflow/}).first().click();
  await page.getByRole("button",{name:"Run now"}).click();await page.getByRole("button",{name:"Steps"}).click();await expect(page.getByText("notification").first()).toBeVisible();
  await expect(page.getByText("completed").first()).toBeVisible();
});

test("knowledge graph renders relationships, provenance, and shortest paths",async({page})=>{
  await login(page);const created=await page.evaluate(async()=>{const post=async(path:string,body:object)=>{const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());return response.json()};const project=await post("/api/v1/projects",{name:"Graph browser project",summary:"private browser summary"}),task=await post("/api/v1/tasks",{title:"Graph browser task",project:"Graph browser project",due:"Today",priority:"Medium"});return {project,task}});
  await page.goto("/graph");await expect(page.getByRole("img",{name:"Noema knowledge graph"})).toBeVisible();await expect(page.getByText("tasks.project")).toBeVisible();
  await page.getByLabel("From").selectOption(`task:${created.task.id}`);await page.getByLabel("To").selectOption(`project:${created.project.id}`);await page.getByRole("button",{name:"Trace path"}).click();
  await expect(page.getByRole("list",{name:"Shortest path"})).toContainText("belongs-to via tasks.project");await expect(page.getByText("private browser summary")).toHaveCount(0);
});

test("custom dashboard creates, edits, derives data, duplicates, and reorders",async({page})=>{
  await login(page);await page.evaluate(async()=>{const response=await fetch("/api/v1/tasks",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({title:"Dashboard browser task",project:"Inbox",due:"Today",priority:"Medium"})});if(!response.ok)throw new Error(await response.text())});await page.goto("/dashboards");await page.getByRole("button",{name:"New dashboard"}).click();await page.getByLabel("Dashboard name").fill("Browser focus");await page.getByRole("button",{name:"Create",exact:true}).click();
  await page.getByRole("button",{name:"tasks"}).click();await page.getByLabel("Tasks title").fill("Today tasks");await page.getByRole("button",{name:"Wider"}).click();await page.getByRole("button",{name:"Save layout"}).click();
  await expect(page.getByText("Today tasks")).toBeVisible();await expect(page.getByText("Dashboard browser task")).toBeVisible();await page.getByRole("button",{name:"Duplicate"}).click();await expect(page.getByRole("button",{name:"Browser focus copy"})).toBeVisible();
  await page.getByRole("button",{name:"Move dashboard left"}).click();await expect(page.getByRole("button",{name:"Browser focus copy"})).toHaveClass(/active/);
});

test("mobile repository IDE registers, browses, edits, and reviews an isolated command",async({page})=>{
  await page.setViewportSize({width:375,height:900});await login(page);await page.goto("/coding");await page.getByLabel("Name").fill("Noema browser");await page.getByLabel("Allowed local path").fill(process.cwd());await page.getByRole("button",{name:"Register"}).click();await page.getByRole("link",{name:/Noema browser/}).click();await expect(page).toHaveURL(/\/coding\/repositories\/[^/]+$/);
  expect(await page.evaluate(async()=>fetch(`/api/v1/repositories/${location.pathname.split("/").pop()}?path=../PROJECT.md`).then(response=>response.status))).toBe(403);await page.getByRole("button",{name:/package.json/}).click();const editor=page.getByLabel(/Editing package.json/);await expect(editor).toBeVisible();await editor.press("End");await page.getByRole("button",{name:"Tab",exact:true}).click();await expect(page.getByRole("button",{name:/Save 1/})).toBeEnabled();
  page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"status",exact:true}).click();await expect(page.getByText(/status · exit 0/)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze()).violations).toEqual([]);
});

test("plugin marketplace inspects, installs, runs, disables, and uninstalls safely",async({page})=>{
  test.setTimeout(90_000);await login(page);await verifyRecentMfa(page);await page.goto("/plugins");await page.getByRole("button",{name:"Inspect source"}).click();const dialog=page.getByRole("dialog");await expect(dialog).toContainText("notifications:write");await expect(dialog).toContainText("process.stdin");page.once("dialog",value=>value.accept());await dialog.getByRole("button",{name:"Install verified package"}).click();await expect(page.getByText("Browser plugin 1.0.0 installed")).toBeVisible();
  page.once("dialog",value=>value.accept());await page.getByRole("button",{name:"Run",exact:true}).click();await expect(page.getByText(/Browser plugin completed · 1 notification effect/)).toBeVisible();page.once("dialog",value=>value.accept());await page.getByRole("button",{name:"Disable",exact:true}).click();await expect(page.getByText("disabled",{exact:true})).toBeVisible();page.once("dialog",value=>value.accept());await page.getByRole("button",{name:"Uninstall",exact:true}).click();await expect(page.getByText("Browser plugin uninstalled")).toBeVisible();await expect(page.getByText("No plugins installed")).toBeVisible();await page.evaluate(async()=>{const response=await fetch("/api/v1/auth/totp",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:"correct horse battery staple"})});if(!response.ok)throw new Error(await response.text())});
});

test("collaboration creates a responsive workspace and reports attributed presence",async({page})=>{
  await page.setViewportSize({width:375,height:900});await login(page);await page.goto("/collaboration");await page.getByLabel("New workspace name").fill("Browser team");await page.getByRole("button",{name:"Create"}).click();await expect(page.getByRole("tab",{name:/Browser team/})).toBeVisible();await expect(page.getByText("owner",{exact:true}).first()).toBeVisible();await expect(page.getByText("owner@example.com").first()).toBeVisible();await expect(page.getByText("1 active")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

for(const width of [375,768,1024,1440])test(`Today visual baseline at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await login(page);await page.goto("/");
  await expect(page).toHaveScreenshot(`today-${width}.png`,{animations:"disabled",caret:"hide",fullPage:true,maxDiffPixelRatio:0.001});
});
