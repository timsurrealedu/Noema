import {expect,test} from "@playwright/test";

test("capture is interpreted, reviewed, applied, and undone",async({page})=>{
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await expect(page).toHaveURL("/");
  await page.getByLabel("Quick capture").fill("Plan the browser-tested release");
  await page.getByRole("button",{name:"Process capture"}).click();
  await expect(page.getByText("Interpreting capture",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Continue in Capture"}).click();
  await expect(page.getByLabel("Capture details").getByText("Plan the browser-tested release",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Confirm all"}).click();
  await expect.poll(()=>page.evaluate(async()=>fetch("/api/v1/state").then(response=>response.json()).then(state=>state.tasks.some((task:{title:string})=>task.title==="Plan the browser-tested release")))).toBe(true);
  await page.goto("/activity");
  const apply=page.locator("article",{hasText:"Applied 1 object(s) from capture"});await apply.getByRole("button",{name:"Undo"}).click();
  await expect.poll(()=>page.evaluate(async()=>fetch("/api/v1/state").then(response=>response.json()).then(state=>({task:state.tasks.some((item:{title:string})=>item.title==="Plan the browser-tested release"),capture:state.captures.find((item:{text:string})=>item.text==="Plan the browser-tested release")?.status})))).toEqual({task:false,capture:"review"});
});
