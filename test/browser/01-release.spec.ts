import AxeBuilder from "@axe-core/playwright";
import {expect,test,type Page} from "@playwright/test";

const routes=["/","/capture","/tasks","/calendar","/vault","/graph","/projects","/study","/coding","/coding/compiler","/automations","/dashboards","/notifications","/activity","/settings","/help"];

async function login(page:Page){
  await page.goto("/login");await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();await expect(page).toHaveURL("/");
}

test("primary routes work at desktop and mobile widths",async({page})=>{
  test.setTimeout(240_000);await login(page);
  for(const width of [1440,375])for(const route of routes){
    await page.setViewportSize({width,height:900});await page.goto(route);await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${route} overflows at ${width}px`).toBe(true);
  }
});

test("primary surfaces pass automated WCAG 2.2 AA rules",async({page})=>{
  test.setTimeout(120_000);await login(page);
  for(const route of ["/","/capture","/tasks","/calendar","/vault","/graph","/dashboards","/settings","/login"]){
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
  await page.goto("/graph");await expect(page.getByRole("img",{name:"LifeOS knowledge graph"})).toBeVisible();await expect(page.getByText("tasks.project")).toBeVisible();
  await page.getByLabel("From").selectOption(`task:${created.task.id}`);await page.getByLabel("To").selectOption(`project:${created.project.id}`);await page.getByRole("button",{name:"Trace path"}).click();
  await expect(page.getByRole("list",{name:"Shortest path"})).toContainText("belongs-to via tasks.project");await expect(page.getByText("private browser summary")).toHaveCount(0);
});

test("custom dashboard creates, edits, derives data, duplicates, and reorders",async({page})=>{
  await login(page);await page.evaluate(async()=>{const response=await fetch("/api/v1/tasks",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({title:"Dashboard browser task",project:"Inbox",due:"Today",priority:"Medium"})});if(!response.ok)throw new Error(await response.text())});await page.goto("/dashboards");await page.getByRole("button",{name:"New dashboard"}).click();await page.getByLabel("Dashboard name").fill("Browser focus");await page.getByRole("button",{name:"Create",exact:true}).click();
  await page.getByRole("button",{name:"tasks"}).click();await page.getByLabel("Tasks title").fill("Today tasks");await page.getByRole("button",{name:"Wider"}).click();await page.getByRole("button",{name:"Save layout"}).click();
  await expect(page.getByText("Today tasks")).toBeVisible();await expect(page.getByText("Dashboard browser task")).toBeVisible();await page.getByRole("button",{name:"Duplicate"}).click();await expect(page.getByRole("button",{name:"Browser focus copy"})).toBeVisible();
  await page.getByRole("button",{name:"Move dashboard left"}).click();await expect(page.getByRole("button",{name:"Browser focus copy"})).toHaveClass(/active/);
});

for(const width of [375,768,1024,1440])test(`Today visual baseline at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await login(page);await page.goto("/");
  await expect(page).toHaveScreenshot(`today-${width}.png`,{animations:"disabled",caret:"hide",fullPage:true,maxDiffPixelRatio:0.001});
});
