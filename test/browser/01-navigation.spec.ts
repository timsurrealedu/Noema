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
