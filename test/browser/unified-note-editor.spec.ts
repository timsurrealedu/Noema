import {expect,test} from "@playwright/test";

async function login(page:import("@playwright/test").Page){
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await expect(page).toHaveURL("/");
}

test("flowing prose and fixed paper stay in one editable note",async({page})=>{
  test.setTimeout(120_000);
  await login(page);
  const response=await page.request.post("/api/v1/notes",{data:{title:"Unified note",content:"# Unified note\n\nFlowing introduction.\n",tags:[]}}),note=await response.json();
  await page.goto(`/vault?open=${note.id}`);
  await expect(page.locator(".mixed-note-editor")).toBeVisible();
  await page.locator(".note-toolbar-menu>summary").click();
  await page.getByRole("button",{name:"Insert grid paper"}).click();
  await expect(page.locator(".fixed-composition-paper.paper-grid")).toBeVisible();
  await page.getByRole("button",{name:"Add text"}).click();
  const label=page.getByRole("textbox",{name:"Composition text"});
  await label.fill("μ = Σx / n");await label.blur();
  await expect.poll(async()=>{const data=await (await page.request.get(`/api/v1/notes/${note.id}/blocks`)).json();return data.blocks.find((block:{kind:string})=>block.kind==="ink")?.composition?.objects?.[0]?.markdown}).toBe("μ = Σx / n");
  await page.reload();
  await expect(page.getByRole("textbox",{name:"Composition text"})).toHaveValue("μ = Σx / n");
  await expect(page.locator(".ProseMirror")).toContainText("Flowing introduction.");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect((await page.locator(".fixed-composition-paper").boundingBox())?.width).toBeLessThanOrEqual(390);
});

test("Keep layout converts prose explicitly",async({page})=>{
  test.setTimeout(120_000);
  await login(page);
  const response=await page.request.post("/api/v1/notes",{data:{title:"Keep layout",content:"# Keep layout\n\nTyped problem statement.\n",tags:[]}}),note=await response.json();
  await page.goto(`/vault?open=${note.id}`);
  await page.getByRole("button",{name:"Handwrite",exact:true}).click();
  await page.getByRole("button",{name:"Keep layout to draw here"}).click();
  await expect(page.locator(".fixed-composition-paper")).toBeVisible();
  await expect(page.getByRole("textbox",{name:"Composition text"})).toContainText("Typed problem statement.");
  const blocks=await (await page.request.get(`/api/v1/notes/${note.id}/blocks`)).json();
  expect(blocks.blocks.map((block:{kind:string})=>block.kind)).toEqual(["ink"]);
  expect(blocks.blocks[0].composition.formatVersion).toBe(1);
});
