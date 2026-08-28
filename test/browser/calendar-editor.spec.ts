import {expect,test,type Page} from "@playwright/test";

test.use({hasTouch:true,viewport:{width:390,height:700}});

async function login(page:Page){
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await expect(page).toHaveURL("/");
}

test("calendar events open a usable editor on touch and windowed layouts",async({page})=>{
  await login(page);
  const title=`Responsive event ${Date.now()}`;
  await page.evaluate(async title=>{
    const start=new Date();start.setHours(10,0,0,0);
    const end=new Date(start);end.setHours(11,0,0,0);
    const response=await fetch("/api/v1/events",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({title,startAt:start.toISOString(),endAt:end.toISOString(),time:"10:00",day:(start.getDay()+6)%7,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});
    if(!response.ok)throw new Error(await response.text());
  },title);
  await page.goto("/calendar");
  await page.getByRole("button",{name:"Week",exact:true}).click();
  const event=page.getByRole("button",{name:new RegExp(title)});
  await expect(event).toBeVisible();
  await event.tap();
  const editor=page.getByRole("dialog",{name:/Edit event/});
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Event name")).toBeVisible();
  await expect(editor.getByRole("button",{name:"Save event"})).toBeVisible();
  const mobile=await editor.evaluate(node=>{const box=node.getBoundingClientRect();return {top:box.top,bottom:box.bottom,height:box.height,viewport:innerHeight}});
  expect(mobile.top).toBeGreaterThanOrEqual(0);
  expect(mobile.bottom).toBeLessThanOrEqual(mobile.viewport);

  await page.setViewportSize({width:900,height:600});
  const windowed=await editor.evaluate(node=>{const box=node.getBoundingClientRect();return {top:box.top,bottom:box.bottom,viewport:innerHeight}});
  expect(windowed.top).toBeGreaterThanOrEqual(0);
  expect(windowed.bottom).toBeLessThanOrEqual(windowed.viewport);
  await expect(editor.getByLabel("Event name")).toBeVisible();
  await expect(editor.getByRole("button",{name:"Save event"})).toBeVisible();
});
