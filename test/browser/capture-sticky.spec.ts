import {expect, test} from "@playwright/test";

test("mobile capture page toolbar sticks to top when scrolling", async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", {name: "Continue securely"}).click();
  await expect(page).toHaveURL("/");

  await page.evaluate(async () => {
    for (let i = 1; i <= 20; i++) {
      await fetch("/api/v1/captures", {
        method: "POST",
        headers: {"Content-Type": "application/json", "Idempotency-Key": `sticky-test-${i}`},
        body: JSON.stringify({text: `Test capture item ${i} for mobile sticky header validation`, source: "typed"})
      });
    }
  });

  await page.goto("/capture");
  await expect(page.locator(".capture-queue-toolbar")).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(200);

  const windowScrollY = await page.evaluate(() => window.scrollY);
  const scrolledBox = await page.locator(".capture-queue-toolbar").boundingBox();

  expect(windowScrollY).toBeGreaterThan(100);
  expect(scrolledBox).not.toBeNull();
  expect(scrolledBox!.y).toBeLessThanOrEqual(2);
});
