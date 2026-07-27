import {expect,test} from "@playwright/test";

test("mobile Chromium verifies the installable PWA contract",async({page})=>{
  await page.goto("/login");
  const manifest=await page.evaluate(()=>fetch("/manifest.webmanifest").then(response=>response.json()));
  expect(manifest).toMatchObject({name:"LifeOS",start_url:"/",display:"standalone"});
  expect(manifest.icons.some((icon:{sizes:string})=>icon.sizes==="192x192")).toBe(true);
  expect(manifest.icons.some((icon:{sizes:string})=>icon.sizes==="512x512")).toBe(true);
  const scope=await page.evaluate(()=>navigator.serviceWorker.ready.then(registration=>registration.scope));
  expect(scope).toBe("http://127.0.0.1:3107/");
  await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  expect(await page.evaluate(()=>matchMedia("(display-mode: browser)").matches)).toBe(true);
});
