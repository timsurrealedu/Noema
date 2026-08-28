import AxeBuilder from "@axe-core/playwright";
import {createHmac} from "node:crypto";
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {expect,test,type Page} from "@playwright/test";

const routes=["/","/capture","/tasks","/calendar","/vault","/graph","/projects","/study","/coding","/coding/compiler","/automations","/notifications","/activity","/settings","/help"];

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

test("mobile primary actions respect hierarchy, geometry, and touch targets",async({page})=>{
  await page.setViewportSize({width:390,height:844});await login(page);
  for(const width of [320,375,390,430]){await page.setViewportSize({width,height:844});await page.goto("/");const home=await page.evaluate(()=>{const input=document.querySelector<HTMLInputElement>(".capture input[type=text]")!,inputBox=input.getBoundingClientRect(),capture=document.querySelector<HTMLElement>(".capture")!.getBoundingClientRect(),fab=document.querySelector<HTMLElement>(".home-task-fab")!.getBoundingClientRect(),nav=document.querySelector<HTMLElement>(".mobile-nav")!.getBoundingClientRect(),captureNav=[...document.querySelectorAll<HTMLElement>(".mobile-nav a")].find(item=>item.textContent?.trim()==="Capture")!.getBoundingClientRect(),captureIcon=[...document.querySelectorAll<HTMLElement>(".mobile-nav a")].find(item=>item.textContent?.trim()==="Capture")!.querySelector("svg")!,iconBox=captureIcon.getBoundingClientRect(),iconStyle=getComputedStyle(captureIcon),targets=[...document.querySelectorAll<HTMLElement>(".capture-add,.capture-tool,.send,.task-view-select,.home-task-fab,.row-menu")].filter(node=>getComputedStyle(node).display!=="none").map(node=>{const box=node.getBoundingClientRect();return {width:box.width,height:box.height}});return {fontSize:parseFloat(getComputedStyle(input).fontSize),placeholder:input.placeholder,inputWidth:inputBox.width,captureWidth:capture.width,fabWidth:fab.width,fabBottom:fab.bottom,navTop:nav.top,navHeight:nav.height,captureNavWidth:captureNav.width,captureNavHeight:captureNav.height,iconWidth:iconBox.width,iconHeight:iconBox.height,iconBackground:iconStyle.backgroundColor,overflow:document.documentElement.scrollWidth-innerWidth,targets}});expect(home.placeholder).toBe("Capture anything…");expect(home.fontSize).toBeGreaterThanOrEqual(16);expect(home.inputWidth).toBeGreaterThanOrEqual(150);expect(home.captureWidth).toBeLessThanOrEqual(width-32);expect(home.fabWidth).toBeLessThan(180);expect(home.fabBottom).toBeLessThanOrEqual(home.navTop-8);expect(home.navHeight).toBeLessThanOrEqual(72);expect(home.captureNavWidth).toBeGreaterThanOrEqual(44);expect(home.captureNavHeight).toBeGreaterThanOrEqual(44);expect(home.iconWidth).toBe(22);expect(home.iconHeight).toBe(22);expect(home.iconBackground).toBe("rgba(0, 0, 0, 0)");expect(home.overflow).toBeLessThanOrEqual(1);for(const target of home.targets){expect(target.width).toBeGreaterThanOrEqual(44);expect(target.height).toBeGreaterThanOrEqual(44)}}
  await page.goto("/capture");const dock=page.locator(".mobile-action-dock"),action=dock.getByRole("link",{name:"Quick capture"});
  await expect(dock).toBeVisible();await expect(action).toBeVisible();
  const geometry=await page.evaluate(()=>{const dock=document.querySelector(".mobile-action-dock")!.getBoundingClientRect(),nav=document.querySelector(".mobile-nav")!.getBoundingClientRect(),action=document.querySelector(".mobile-action-dock .primary")!.getBoundingClientRect();return {dockBottom:dock.bottom,navTop:nav.top,dockWidth:dock.width,actionWidth:action.width,viewport:innerWidth}});
  expect(Math.abs(geometry.dockBottom-geometry.navTop)).toBeLessThanOrEqual(1);expect(geometry.dockWidth).toBe(geometry.viewport);expect(geometry.actionWidth).toBeGreaterThanOrEqual(geometry.viewport-32);
  await page.goto("/calendar");
  const syncButton=page.getByRole("button",{name:"Sync calendar"}),addButton=page.getByRole("button",{name:"New event"});
  await expect(syncButton).toBeVisible();await expect(addButton).toBeVisible();
  expect(await page.locator(".mobile-action-dock").count()).toBe(0);
  const toolbar=await page.evaluate(()=>{const nav=document.querySelector(".mobile-nav")!.getBoundingClientRect(),add=document.querySelector(".calendar-mobile-add")!.getBoundingClientRect(),sync=document.querySelector(".calendar-mobile-sync")!.getBoundingClientRect();return {navTop:nav.top,addBottom:add.bottom,syncBottom:sync.bottom,addWidth:add.width,syncWidth:sync.width}});
  expect(toolbar.addBottom).toBeLessThanOrEqual(toolbar.navTop);expect(toolbar.syncBottom).toBeLessThanOrEqual(toolbar.navTop);expect(toolbar.addWidth).toBeLessThan(72);expect(toolbar.syncWidth).toBeLessThan(72);
});

test("mobile navigation persists and fixed actions never cover scrollable content",async({page})=>{
  await page.setViewportSize({width:390,height:844});await login(page);
  await page.evaluate(()=>Reflect.set(window,"__mobileNav",document.querySelector(".mobile-nav")));
  await page.locator(".mobile-nav").getByRole("link",{name:"Capture"}).click();await expect(page).toHaveURL(/\/capture$/);
  expect(await page.evaluate(()=>Reflect.get(window,"__mobileNav")===document.querySelector(".mobile-nav"))).toBe(true);
  const capture=await page.evaluate(()=>{const pane=document.querySelector<HTMLElement>(".capture-list-pane")!,dock=document.querySelector<HTMLElement>(".capture-mobile-dock")!,nav=document.querySelector<HTMLElement>(".mobile-nav")!;pane.scrollTop=pane.scrollHeight;return {paddingBottom:parseFloat(getComputedStyle(pane).paddingBottom),dockTop:dock.getBoundingClientRect().top,navTop:nav.getBoundingClientRect().top,scrollBottom:pane.scrollHeight-pane.scrollTop-pane.clientHeight}});expect(capture.paddingBottom).toBeGreaterThanOrEqual(136);expect(capture.dockTop).toBeLessThanOrEqual(capture.navTop);expect(capture.scrollBottom).toBeLessThanOrEqual(1);
});

test("mobile calendar keeps timeline endpoints and month-end dates reachable",async({page})=>{await page.setViewportSize({width:320,height:700});await login(page);await page.goto("/calendar");for(const [label,selector] of [["Day",".day-view"],["Week",".week-scroll"]] as const){await page.getByRole("button",{name:label,exact:true}).click();const result=await page.evaluate(selector=>{const scroller=document.querySelector<HTMLElement>(selector)!,times=[...scroller.querySelectorAll<HTMLElement>(".times time")],nav=document.querySelector<HTMLElement>(".mobile-nav")!;scroller.scrollTop=0;const first=times[0].getBoundingClientRect(),area=scroller.getBoundingClientRect();scroller.scrollTop=scroller.scrollHeight;const last=times.at(-1)!.getBoundingClientRect();return {firstTop:first.top,areaTop:area.top,lastBottom:last.bottom,areaBottom:area.bottom,navTop:nav.getBoundingClientRect().top,last:times.at(-1)!.textContent}} ,selector);expect(result.firstTop).toBeGreaterThanOrEqual(result.areaTop);expect(result.last).toBe("24:00");expect(result.lastBottom).toBeLessThanOrEqual(result.areaBottom);expect(result.areaBottom).toBeLessThanOrEqual(result.navTop)}await page.getByRole("button",{name:"Month",exact:true}).click();const month=await page.evaluate(()=>{const target=[...document.querySelectorAll<HTMLElement>(".month-view button")].find(button=>button.querySelector("span")?.textContent==="31")!,scroller=document.querySelector<HTMLElement>(".month-scroll")!,nav=document.querySelector<HTMLElement>(".mobile-nav")!;scroller.scrollTop=scroller.scrollHeight;const area=scroller.getBoundingClientRect();return {bottom:target.getBoundingClientRect().bottom,areaBottom:area.bottom,navTop:nav.getBoundingClientRect().top,scrollHeight:scroller.scrollHeight,clientHeight:scroller.clientHeight}});expect(month.scrollHeight).toBeGreaterThan(month.clientHeight);expect(month.bottom).toBeLessThanOrEqual(month.areaBottom);expect(month.areaBottom).toBeLessThanOrEqual(month.navTop)});

test("primary surfaces pass automated WCAG 2.2 AA rules",async({page})=>{
  test.setTimeout(120_000);await login(page);
  for(const route of ["/","/capture","/tasks","/calendar","/vault","/graph","/settings","/login"]){
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
  await page.goto("/vault");await page.getByRole("button",{name:/Graph/}).click();await expect(page.getByRole("img",{name:"Noema knowledge graph"})).toBeVisible();await expect(page.getByText("tasks.project")).toBeVisible();
  await page.getByLabel("From").selectOption(`task:${created.task.id}`);await page.getByLabel("To").selectOption(`project:${created.project.id}`);await page.getByRole("button",{name:"Trace path"}).click();
  await expect(page.getByRole("list",{name:"Shortest path"})).toContainText("belongs-to via tasks.project");await expect(page.getByText("private browser summary")).toHaveCount(0);
});

test("vault task renders once in Calendar and opens its source-aware Task inspector",async({page})=>{const vault=mkdtempSync(join(tmpdir(),"noema-vault-browser-")),todo=join(vault,"TODO","2026"),file=join(todo,"July.md");mkdirSync(todo,{recursive:true});writeFileSync(file,"# July\n\n- [ ] Browser vault task 29 Jul 10:00 #remind15\n");try{await login(page);await page.evaluate(async rootPath=>{const post=async(path:string,body:object)=>{const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());return response.json()};const source=await post("/api/v1/vault-sources",{rootPath,name:"Browser vault",taskFolders:["TODO/"]});await post(`/api/v1/vault-sources/${source.id}/sync`,{})},vault);await page.goto("/calendar");const item=page.getByRole("button",{name:/Browser vault task/});await expect(item).toHaveCount(1);await item.click();await expect(page).toHaveURL(/\/\?open=/);await expect(page.getByText("Browser vault · TODO/2026/July.md")).toBeVisible();await expect(page.getByRole("link",{name:"Open source note"})).toBeVisible();await page.getByLabel("Task name").fill("Edited browser vault task");await page.getByRole("button",{name:"Save task"}).click();await expect.poll(()=>readFileSync(file,"utf8")).toMatch(/- \[ \] Edited browser vault task 29 Jul 10:00 #remind15 \^noema-/);const sync=await page.evaluate(()=>fetch("/api/v1/calendar-sync").then(response=>response.json()));expect(sync.writes).toEqual([])}finally{rmSync(vault,{recursive:true,force:true})}});

test("handwriting survives tablet rotation and round-trips to Obsidian",async({page})=>{const vault=mkdtempSync(join(tmpdir(),"noema-ink-browser-")),file=join(vault,"Sketch.md");writeFileSync(file,"# Sketch\n\nTyped block\n");try{await page.setViewportSize({width:1280,height:800});await login(page);await page.evaluate(async rootPath=>{const post=async(path:string,body:object)=>{const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());return response.json()};const source=await post("/api/v1/vault-sources",{rootPath,name:"Ink vault"});await post(`/api/v1/vault-sources/${source.id}/sync`,{})},vault);await page.goto("/vault");await page.getByRole("button",{name:"Sketch Sketch.md",exact:true}).click();await page.getByRole("button",{name:"Ink block"}).click();const canvas=page.getByRole("img",{name:"Pressure-aware handwriting canvas"}),box=await canvas.boundingBox();expect(box).not.toBeNull();await page.mouse.move(box!.x+50,box!.y+60);await page.mouse.down();await page.mouse.move(box!.x+220,box!.y+140,{steps:8});await page.mouse.up();await page.getByRole("button",{name:"Save ink"}).click();await expect(page.getByText("Saved · OCR queued",{exact:true})).toBeVisible();await expect.poll(()=>readFileSync(file,"utf8")).toMatch(/noema:ink:[\s\S]*Noema Ink/);await page.setViewportSize({width:800,height:1280});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);await page.keyboard.press("Tab");await expect(page.locator(":focus")).toBeVisible()}finally{rmSync(vault,{recursive:true,force:true})}});

test.skip("post-v1 dashboard creates, edits, derives data, duplicates, and reorders",async({page})=>{
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

test.skip("post-v1 plugin marketplace inspects, installs, runs, disables, and uninstalls safely",async({page})=>{
  test.setTimeout(90_000);await login(page);await verifyRecentMfa(page);await page.goto("/plugins");await page.getByRole("button",{name:"Inspect source"}).click();const dialog=page.getByRole("dialog");await expect(dialog).toContainText("notifications:write");await expect(dialog).toContainText("process.stdin");page.once("dialog",value=>value.accept());await dialog.getByRole("button",{name:"Install verified package"}).click();await expect(page.getByText("Browser plugin 1.0.0 installed")).toBeVisible();
  page.once("dialog",value=>value.accept());await page.getByRole("button",{name:"Run",exact:true}).click();await expect(page.getByText(/Browser plugin completed · 1 notification effect/)).toBeVisible();page.once("dialog",value=>value.accept());await page.getByRole("button",{name:"Disable",exact:true}).click();await expect(page.getByText("disabled",{exact:true})).toBeVisible();page.once("dialog",value=>value.accept());await page.getByRole("button",{name:"Uninstall",exact:true}).click();await expect(page.getByText("Browser plugin uninstalled")).toBeVisible();await expect(page.getByText("No plugins installed")).toBeVisible();await page.evaluate(async()=>{const response=await fetch("/api/v1/auth/totp",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:"correct horse battery staple"})});if(!response.ok)throw new Error(await response.text())});
});

test.skip("post-v1 collaboration creates a responsive workspace and reports attributed presence",async({page})=>{
  await page.setViewportSize({width:375,height:900});await login(page);await page.goto("/collaboration");await page.getByLabel("New workspace name").fill("Browser team");await page.getByRole("button",{name:"Create"}).click();await expect(page.getByRole("tab",{name:/Browser team/})).toBeVisible();await expect(page.getByText("owner",{exact:true}).first()).toBeVisible();await expect(page.getByText("owner@example.com").first()).toBeVisible();await expect(page.getByText("1 active")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

for(const width of [375,768,1024,1440])test(`Today visual baseline at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await login(page);await page.goto("/");
  await expect(page).toHaveScreenshot(`today-${width}.png`,{animations:"disabled",caret:"hide",fullPage:true,maxDiffPixelRatio:0.001});
});
