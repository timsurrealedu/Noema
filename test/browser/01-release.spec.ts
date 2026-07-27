import AxeBuilder from "@axe-core/playwright";
import {expect,test,type Page} from "@playwright/test";

const routes=["/","/capture","/tasks","/calendar","/vault","/projects","/study","/coding","/coding/compiler","/automations","/notifications","/activity","/settings","/help"];

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
  for(const route of ["/","/capture","/tasks","/calendar","/vault","/settings","/login"]){
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

for(const width of [375,768,1024,1440])test(`Today visual baseline at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await login(page);await page.goto("/");
  await expect(page).toHaveScreenshot(`today-${width}.png`,{animations:"disabled",caret:"hide",fullPage:true,maxDiffPixelRatio:0.001});
});
