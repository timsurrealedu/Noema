import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {defineConfig,devices} from "@playwright/test";

const dataDir=mkdtempSync(join(tmpdir(),"lifeos-browser-"));
const port=Number(process.env.LIFEOS_TEST_PORT||3107),baseURL=`http://127.0.0.1:${port}`;

export default defineConfig({
  testDir:"test/browser",
  fullyParallel:false,
  workers:1,
  reporter:"line",
  expect:{timeout:20_000},
  use:{baseURL,trace:"retain-on-failure"},
  projects:[
    {name:"firefox",testIgnore:"**/install.spec.ts",use:{...devices["Desktop Firefox"]}},
    {name:"mobile-chromium",testMatch:"**/install.spec.ts",use:{...devices["Pixel 7"]}},
  ],
  webServer:{
    command:`npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url:`${baseURL}/login`,
    reuseExistingServer:false,
    timeout:120_000,
    env:{
      LIFEOS_DATA_DIR:dataDir,
      LIFEOS_OWNER_EMAIL:"owner@example.com",
      LIFEOS_OWNER_PASSWORD:"correct horse battery staple",
      LIFEOS_ENCRYPTION_KEY:"browser-test-encryption-key-at-least-32-characters",
      LIFEOS_REPOSITORY_ROOTS:process.cwd(),
      LIFEOS_PLUGIN_CATALOGS:join(process.cwd(),"test/fixtures/plugin-catalog"),
    },
  },
});
