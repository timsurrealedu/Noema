import { chromium } from "playwright-core";

const pages = [
  ["/calendar", "calendar"],
  ["/capture", "capture"],
  ["/coding/compiler", "compiler"],
  ["/", "home"],
];
const viewports = [
  [{ width: 390, height: 844 }, "m390"],
  [{ width: 360, height: 780 }, "m360"],
  [{ width: 1440, height: 900 }, "d1440"],
];

const browser = await chromium.launch({ executablePath: "/usr/sbin/chromium", args: ["--no-sandbox"] });
for (const [path, name] of pages) {
  for (const [vp, label] of viewports) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2, isMobile: label !== "d1440", hasTouch: label !== "d1440" });
    try {
      await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle", timeout: 30000 });
    } catch { /* keep going with whatever rendered */ }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `/tmp/noema-${name}-${label}.png` });
    await page.close();
    console.log(`shot ${name} ${label}`);
  }
}
await browser.close();
