import { expect, test } from "@playwright/test";

test("vault interactive physics knowledge graph operates smoothly and stably", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Continue securely" }).click();
  await expect(page).toHaveURL("/");

  // Create captures and tasks to populate the knowledge graph
  await page.getByLabel("Quick capture").fill("Physics Engine Research Note #math #simulation");
  await page.getByRole("button", { name: "Process capture" }).click();
  await expect(page.getByText("Interpreting capture", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Continue in Capture" }).click();
  await page.getByRole("button", { name: "Confirm all" }).click();

  // Navigate to Vault
  await page.goto("/vault");
  await expect(page.locator(".obsidian-vault")).toBeVisible();

  // Click the Graph toggle in header
  const graphBtn = page.getByRole("button", { name: "Graph" });
  await expect(graphBtn).toBeVisible();
  await graphBtn.click();

  // Verify Graph Canvas is rendered
  const canvas = page.locator(".graph-canvas canvas");
  await expect(canvas).toBeVisible();

  // Verify canvas dimensions are valid non-zero numbers
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(200);
  expect(box!.height).toBeGreaterThan(200);

  // Test HUD drawer toggle
  const settingsBtn = page.getByRole("button", { name: "Graph settings & physics controls" });
  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();
  const hudPanel = page.getByRole("region", { name: "Graph display and physics controls" });
  await expect(hudPanel).toBeVisible();

  // Test Tab switching in HUD
  await page.getByRole("tab", { name: "Display" }).click();
  await expect(page.getByText("Node size")).toBeVisible();
  await expect(page.getByText("Line thickness")).toBeVisible();

  await page.getByRole("tab", { name: "Filters" }).click();
  await expect(page.getByText("Toggle Types:")).toBeVisible();

  await page.getByRole("tab", { name: "Forces" }).click();
  await expect(page.getByText("Repulsion force")).toBeVisible();
  await expect(page.getByText("Center force")).toBeVisible();
  await expect(page.getByText("Link distance")).toBeVisible();

  // Test Scramble and Reset buttons
  await page.getByRole("button", { name: "Scramble layout" }).click();
  await page.getByRole("button", { name: "Reset physics" }).click();

  // Close HUD
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("region", { name: "Graph display and physics controls" })).toHaveCount(0);

  // Test Canvas Dragging (Pan)
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 80, centerY + 50, { steps: 8 });
  await page.mouse.up();

  // Test Wheel Zoom
  await page.mouse.move(centerX, centerY);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(100);
  await page.mouse.wheel(0, 200);

  // Test Floating Controls
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Fit graph to view" }).click();
  await page.getByRole("button", { name: "Reset camera" }).click();
  await page.getByRole("button", { name: "Pause physics" }).click();
  await page.getByRole("button", { name: "Play physics" }).click();

  // Test Filter toolbar search input
  const searchInput = page.getByPlaceholder("Search notes, tags, objects…");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("Physics");
  await searchInput.fill("");

  // Test Hide Orphans button
  const hideOrphansBtn = page.getByRole("button", { name: "Hide orphans" });
  await expect(hideOrphansBtn).toBeVisible();
  await hideOrphansBtn.click();
  await hideOrphansBtn.click();

  // Test Accessible Relationship Table
  const table = page.locator(".graph-table table");
  await expect(table).toBeVisible();

  // Test Shortest Path Finder UI
  const pathFinder = page.locator(".path-finder");
  await expect(pathFinder).toBeVisible();

  expect(errors).toEqual([]);
});
