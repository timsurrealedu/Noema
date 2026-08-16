import {expect,test} from "@playwright/test";

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
