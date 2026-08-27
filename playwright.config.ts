import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {defineConfig,devices} from "@playwright/test";

const dataDir=mkdtempSync(join(tmpdir(),"noema-browser-"));
const port=Number(process.env.NOEMA_TEST_PORT||3107),baseURL=`http://127.0.0.1:${port}`;

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
    {name:"desktop-chrome",testMatch:"**/04-ink-gestures.spec.ts",use:{...devices["Desktop Chrome"]}},
  ],
  webServer:{
    command:`node server/worker.mjs & npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url:`${baseURL}/login`,
    reuseExistingServer:false,
    timeout:120_000,
    env:{
      NOEMA_DATA_DIR:dataDir,
      NOEMA_OWNER_EMAIL:"owner@example.com",
      NOEMA_OWNER_PASSWORD:"correct horse battery staple",
      NOEMA_ENCRYPTION_KEY:"browser-test-encryption-key-at-least-32-characters",
      NOEMA_REPOSITORY_ROOTS:process.cwd(),
      NOEMA_PLUGIN_CATALOGS:join(process.cwd(),"test/fixtures/plugin-catalog"),
      NOEMA_CODEX_ENABLED:"true",
      NOEMA_CODEX_PATH:join(process.cwd(),"test/fixtures/fake-codex.mjs"),
      NOEMA_AI_FAST_CHAIN:"codex:configured",
    },
  },
});
