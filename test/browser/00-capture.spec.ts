import {expect,test} from "@playwright/test";

test("quick capture starts, cancels, and retries durable interpretation",async({page})=>{
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button",{name:"Continue securely"}).click();
  await expect(page).toHaveURL("/");
  await page.getByLabel("Quick capture").fill("Plan the browser-tested release");
  await page.getByRole("button",{name:"Process capture"}).click();
  await expect(page.getByText("Interpreting capture",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Continue in Capture"}).click();
  await expect(page.getByText("Interpreting this capture",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Cancel"}).click();
  await expect(page.getByText("Interpretation cancelled.")).toBeVisible();
  await page.getByRole("button",{name:"Try again"}).click();
  await expect(page.getByText("Interpreting this capture",{exact:true})).toBeVisible();
});
