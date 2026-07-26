const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("core frontend routes exist",()=>{
  for(const route of ["activity","automations","calendar","capture","coding","login","projects","settings","study","tasks","vault"])
    assert.ok(fs.existsSync(path.join(root,"app",route,"page.tsx")),route);
});

test("coding compiler workspace exists",()=>{
  assert.ok(fs.existsSync(path.join(root,"app","coding","compiler","page.tsx")));
  assert.match(read("app/coding/compiler/page.tsx"),/\/api\/v1\/compiler\/run/);
});

test("compiler requires an exact reviewable approval before execution",()=>{
  const page=read("app/coding/compiler/page.tsx"),route=read("app/api/v1/compiler/run/route.ts");assert.match(page,/\/api\/v1\/approvals/);assert.match(page,/Affected files/);assert.match(page,/Approval required/);assert.match(route,/consumeApproval/);
});

test("Vault and compiler expose the contextual tutor",()=>{
  for(const file of ["app/vault/page.tsx","app/coding/compiler/page.tsx"])assert.match(read(file),/TutorPanel/);
  const panel=read("app/components/TutorPanel.tsx");assert.match(panel,/lifeos-tutor-mobile-mode/);assert.match(panel,/Apply to editor/);assert.match(panel,/Add to note/);
});

test("shared shell exposes keyboard search and accessible navigation",()=>{
  const shell=read("app/components/ModuleShell.tsx");
  assert.match(shell,/metaKey\|\|event\.ctrlKey/);
  assert.match(shell,/\/api\/v1\/search\?q=/);
  assert.match(shell,/data\.events\.map/);
  assert.match(shell,/\?open=\$\{item\.id\}/);
  assert.match(shell,/\/api\/v1\/notifications/);
  assert.match(shell,/\/read`,\{method:"POST"/);
  assert.match(read("app/components/ModalDialog.tsx"),/aria-label="Search LifeOS"/);
  assert.match(shell,/Skip to main content/);
});

test("command palettes use a focus-trapping native modal",()=>{
  assert.match(read("app/components/ModalDialog.tsx"),/showModal\(\)/);
  for(const file of ["app/page.tsx","app/components/ModuleShell.tsx"])assert.match(read(file),/<ModalDialog/);
});

test("PWA includes offline shell, share target, and raster icons",()=>{
  const manifest=JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.share_target.action,"/capture");
  assert.ok(manifest.icons.some(icon=>icon.sizes==="192x192"));
  assert.ok(manifest.icons.some(icon=>icon.sizes==="512x512"));
  assert.match(read("public/sw.js"),/caches\.open/);
});

test("reduced motion and responsive breakpoints remain enforced",()=>{
  const css=read("app/globals.css");
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/@media\(max-width:820px\)/);
  assert.match(css,/focus-visible/);
});

test("remote actions disclose missing AI and persistence",()=>{
  const notice=read("app/components/ServiceNotice.tsx");
  assert.match(notice,/role="alert"/);
  assert.match(notice,/AI and server persistence aren’t connected yet/);
  assert.doesNotMatch(read("app/login/page.tsx"),/secure sign-in link was sent/i);
  const today=read("app/page.tsx");
  assert.match(today,/Sample interpretation/);
  assert.doesNotMatch(today,/AI interpretation is not connected/);
  assert.doesNotMatch(today,/File captured\. Server interpretation/);
});

test("frontend roadmap separates UI completion from integrations",()=>{
  const roadmap=read("FRONTEND_ROADMAP.md");
  assert.match(roadmap,/## Backend integration backlog/);
  assert.match(roadmap,/## Completion contract/);
  assert.match(roadmap,/Sample-state controls are prototypes/);
  assert.match(roadmap,/Google Calendar is the first supported external provider/);
  assert.match(roadmap,/Full mobile repository IDE/);
});

test("offline mutations queue durably and replay idempotently",()=>{
  const queue=read("app/lib/offlineQueue.ts"),pwa=read("app/components/PWARegister.tsx"),worker=read("public/sw.js");
  assert.match(queue,/databaseName="lifeos-offline-v1"/);
  assert.match(queue,/idempotencyKey/);
  assert.match(queue,/dependencies\.some/);
  assert.match(queue,/locks\.request\("lifeos-offline-replay"/);
  assert.match(queue,/status:response\.status===409\?"conflict"/);
  assert.match(pwa,/addEventListener\("online"/);
  assert.match(worker,/lifeos-mutations/);
});

test("Activity reads durable audit events and executes undo",()=>{
  const activity=read("app/activity/page.tsx");
  assert.match(activity,/\/api\/v1\/audit\?limit=100/);
  assert.match(activity,/\/api\/v1\/audit\/\$\{event\.id\}\/undo/);
  assert.match(activity,/Idempotency-Key/);
});

test("login supports an optional authenticator challenge",()=>{
  const login=read("app/login/page.tsx");
  assert.match(login,/mfaRequired/);
  assert.match(login,/autoComplete="one-time-code"/);
  assert.match(login,/pattern="\[0-9\]\{6\}"/);
});

test("login and Settings expose recovery and MFA revocation controls",()=>{
  const login=read("app/login/page.tsx"),settings=read("app/settings/page.tsx");assert.match(login,/recoveryCode/);assert.match(login,/Use a recovery code/);assert.match(settings,/\/api\/v1\/auth\/recovery/);assert.match(settings,/method:"DELETE"/);assert.match(settings,/invalidates every recovery code/);
});

test("Settings workspace export downloads a streamed archive",()=>{
  assert.match(read("app/components/ServiceNotice.tsx"),/location\.assign\("\/api\/v1\/export"\)/);
  const route=read("app/api/v1/export/route.ts");assert.match(route,/requireMfa/);assert.match(route,/application\/x-tar/);assert.match(route,/workspace\.json/);assert.match(route,/assets\//);
});

test("Settings loads and saves persisted account controls",()=>{
  const page=read("app/settings/page.tsx");assert.match(page,/\/api\/v1\/settings/);assert.match(page,/\/api\/v1\/settings\/password/);assert.match(page,/\/api\/v1\/auth\/sessions/);assert.match(page,/\/api\/v1\/auth\/totp/);assert.match(page,/Idempotency-Key/);
});

test("Automations use durable API state and runs",()=>{
  const page=read("app/automations/page.tsx");
  assert.match(page,/\/api\/v1\/automations/);
  assert.match(page,/\/runs/);
  assert.match(page,/metrics/);
  assert.doesNotMatch(page,/Stewie Channel Pipeline/);
});

test("tasks and events expose durable reminder controls",()=>{
  for(const file of ["app/tasks/page.tsx","app/calendar/page.tsx"])assert.match(read(file),/type="datetime-local"/);
  assert.match(read("server/worker.mjs"),/deliverDueReminders/);
});

test("Vault exposes reviewable Draft optimization",()=>{
  const vault=read("app/vault/page.tsx");assert.match(vault,/Optimize draft/);assert.match(vault,/Optimization review/);assert.match(vault,/Apply proposal/);assert.match(vault,/\/optimizations/);assert.match(read("server/worker.mjs"),/note-optimize/);
});

test("Tutor resumes sessions and inserts messages through the API",()=>{
  const panel=read("app/components/TutorPanel.tsx");assert.match(panel,/subjectId=/);assert.match(panel,/sessionId/);assert.match(panel,/\/tutor\/messages\/\$\{message\.id\}\/insert/);assert.match(panel,/insertedNoteId/);
});
