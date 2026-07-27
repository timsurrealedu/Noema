import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {defineConfig,devices} from "@playwright/test";

const dataDir=mkdtempSync(join(tmpdir(),"lifeos-browser-"));

export default defineConfig({
  testDir:"test/browser",
  fullyParallel:false,
  workers:1,
  reporter:"line",
  expect:{timeout:20_000},
  use:{baseURL:"http://127.0.0.1:3107",trace:"retain-on-failure"},
  projects:[{name:"firefox",use:{...devices["Desktop Firefox"]}}],
  webServer:{
    command:"npm run dev -- --hostname 127.0.0.1 --port 3107",
    url:"http://127.0.0.1:3107/login",
    reuseExistingServer:false,
    timeout:120_000,
    env:{
      LIFEOS_DATA_DIR:dataDir,
      LIFEOS_OWNER_EMAIL:"owner@example.com",
      LIFEOS_OWNER_PASSWORD:"correct horse battery staple",
      LIFEOS_ENCRYPTION_KEY:"browser-test-encryption-key-at-least-32-characters",
    },
  },
});
