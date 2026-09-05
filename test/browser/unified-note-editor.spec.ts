import {expect,test} from "@playwright/test";

async function login(page:import("@playwright/test").Page){
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await expect(page).toHaveURL("/");
}

test("Fit screen changes to fixed Paper only after confirmation",async({page})=>{
  test.setTimeout(120_000);
  await login(page);
  const response=await page.request.post("/api/v1/notes",{data:{title:"Unified note",content:"# Unified note\n\nFlowing introduction.\n",tags:[]}}),note=await response.json();
  await page.goto(`/vault?open=${note.id}`);
  await expect(page.locator(".mixed-note-editor")).toBeVisible();
  await expect(page.locator(".integrated-doc-page.fit-layout")).toBeVisible();
  await page.getByRole("button",{name:"Handwrite",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Use Paper layout"})).toBeVisible();
  await expect(page.locator(".integrated-doc-page.fit-layout")).toBeVisible();
  await page.getByRole("button",{name:"Use paper",exact:true}).click();
  await expect(page.locator(".integrated-doc-page.paper-layout")).toBeVisible();
  await page.locator(".note-toolbar-menu>summary").click();
  await page.getByRole("button",{name:"Place text"}).click();
  const label=page.getByRole("textbox",{name:"Positioned text"});
  await label.fill("μ = Σx / n");await label.blur();
  await expect.poll(async()=>{const data=await (await page.request.get(`/api/v1/notes/${note.id}/blocks`)).json();return data.blocks.find((block:{kind:string})=>block.kind==="ink")?.composition?.objects?.[0]?.markdown}).toBe("μ = Σx / n");
  await page.reload();
  await expect(page.getByRole("textbox",{name:"Positioned text"})).toHaveValue("μ = Σx / n");
  await expect(page.locator(".ProseMirror")).toContainText("Flowing introduction.");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect((await page.locator(".integrated-doc-page.paper-layout").boundingBox())?.width).toBeLessThanOrEqual(390);
});

test("Paper extent persists and empty Paper can return to Fit screen",async({page})=>{
  test.setTimeout(120_000);
  await login(page);
  const response=await page.request.post("/api/v1/notes",{data:{title:"Keep layout",content:"# Keep layout\n\nTyped problem statement.\n",tags:[]}}),note=await response.json();
  await page.goto(`/vault?open=${note.id}`);
  await page.getByRole("button",{name:"Handwrite",exact:true}).click();
  await page.getByRole("button",{name:"Use paper",exact:true}).click();
  await page.locator(".note-toolbar-menu>summary").click();
  await page.getByRole("button",{name:"Add page"}).click();
  const blocks=await (await page.request.get(`/api/v1/notes/${note.id}/blocks`)).json();
  const ink=blocks.blocks.find((block:{kind:string})=>block.kind==="ink");
  expect(ink.composition).toMatchObject({formatVersion:2,layout:"paper",paperWidth:794,writingExtent:2246});
  await page.getByRole("button",{name:"Fit screen"}).click();
  await expect(page.locator(".integrated-doc-page.fit-layout")).toBeVisible();
});
