const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("core frontend routes exist",()=>{
  for(const route of ["activity","automations","calendar","capture","coding","dashboards","graph","login","projects","settings","study","tasks","vault"])
    assert.ok(fs.existsSync(path.join(root,"app",route,"page.tsx")),route);
});

test("coding compiler workspace exists",()=>{
  assert.ok(fs.existsSync(path.join(root,"app","coding","compiler","page.tsx")));
  assert.match(read("app/coding/compiler/page.tsx"),/\/api\/v1\/compiler\/run/);
});

test("compiler requires an exact reviewable approval before execution",()=>{
  const page=read("app/coding/compiler/page.tsx"),route=read("app/api/v1/compiler/run/route.ts");assert.match(page,/\/api\/v1\/approvals/);assert.match(page,/Affected files/);assert.match(page,/Approval required/);assert.match(route,/consumeApproval/);
});

test("Coding dashboard uses persisted repositories and approvals",()=>{const page=read("app/coding/page.tsx");assert.match(page,/\/api\/v1\/approvals/);assert.match(page,/\/api\/v1\/repositories/);assert.match(page,/LIFEOS_REPOSITORY_ROOTS/);assert.match(page,/Approval history/);assert.doesNotMatch(page,/Run staging database migration|Approve once|const sessions=/) });

test("mobile repository IDE reviews edits, commands, commits, and reverts",()=>{const page=read("app/coding/repositories/[id]/page.tsx"),route=read("app/api/v1/repositories/[id]/route.ts"),gitRoute=read("app/api/v1/repositories/[id]/git/route.ts"),service=read("server/repositories.mjs");for(const value of [/repository\.edit/,/repository\.command/,/repository\.\$\{input\.action\}/,/mobile-toolbar/,/Working-tree review/])assert.match(page,value);assert.match(route,/consumeApproval/);assert.match(gitRoute,/repository\.\$\{input\.action\}/);assert.match(service,/Symlink escape/);assert.match(service,/VERSION_CONFLICT/);assert.match(service,/--unshare-all/);assert.match(service,/Command is not allowlisted/)});

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

test("global search exposes optional attributed semantic ranking",()=>{const shell=read("app/components/ModuleShell.tsx"),route=read("app/api/v1/search/route.ts"),search=read("server/search.mjs");assert.match(shell,/Semantic ranking/);assert.match(shell,/configured OpenAI embedding model/);assert.match(shell,/ranking\.source/);assert.match(route,/semantic:params\.get\("semantic"\)===\"true\"/);assert.match(search,/SQLite FTS\/LIKE/);assert.match(search,/selected\.add/);assert.match(search,/fallback:/) });

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
  assert.match(today,/addAndInterpretCapture/);
  assert.match(today,/Interpretation ready/);
  assert.match(today,/navigator\.mediaDevices\.getUserMedia/);
  assert.match(today,/new MediaRecorder/);
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

test("Study uses persisted APIs without dashboard fixtures",()=>{
  const study=read("app/study/page.tsx"),quizzes=read("app/api/v1/study/quizzes/route.ts");for(const path of ["courses","assignments","cards","quizzes"])assert.match(study,new RegExp(`/api/v1/study/${path}`));assert.doesNotMatch(study,/Computer Networks|Database Systems|Operating Systems/);assert.match(study,/up to 50 MB/);assert.match(quizzes,/listQuizzes/);
});

test("Projects derives tabs from persisted relationships",()=>{
  const page=read("app/projects/page.tsx"),route=read("app/api/v1/projects/[id]/route.ts");assert.doesNotMatch(page,/sampleProjects|RevoU Partnership/);assert.match(page,/workspace\.links\.filter/);assert.match(page,/milestones/);assert.match(page,/blockers/);assert.match(route,/projectWorkspace/);
});

test("contextual assistant renders persisted reviewable recommendations",()=>{
  const shell=read("app/components/ModuleShell.tsx");assert.doesNotMatch(shell,/proposal review is the best next action/);assert.match(shell,/\/api\/v1\/recommendations/);assert.match(shell,/Create task/);assert.match(shell,/persisted drafts/);
});

test("Vault renders accessible charts and Mermaid with source fallback",()=>{
  const content=read("app/components/MarkdownContent.tsx"),vault=read("app/vault/page.tsx");assert.match(content,/```\(mermaid\|chart\)/);assert.match(content,/role="img"/);assert.match(content,/<table>/);assert.match(content,/scope="row"/);assert.match(content,/Diagram could not be rendered/);assert.match(content,/View Mermaid source/);assert.match(vault,/MarkdownContent/);
});
test("PDF annotation workspace persists page coordinates, comments, links, and exports",()=>{const page=read("app/assets/[id]/annotate/page.tsx");assert.match(page,/\/annotations/);assert.match(page,/geometry/);assert.match(page,/Link type/);assert.match(page,/Export/)});
test("job streams resume by event ID and emit heartbeats",()=>{const stream=read("app/api/v1/jobs/[id]/events/route.ts"),retry=read("app/api/v1/jobs/[id]/retry/route.ts");assert.match(stream,/last-event-id/);assert.match(stream,/id: \$\{id\}/);assert.match(stream,/: heartbeat/);assert.match(retry,/retryJob/)});
test("notification deliveries expose durable status and retry controls",()=>{const route=read("app/api/v1/notification-deliveries/[id]/route.ts"),push=read("server/push.mjs");assert.match(route,/retryDelivery/);assert.match(route,/resolveDelivery/);assert.match(push,/permanent-failure/);assert.match(push,/status===404\|\|status===410/)});
test("Settings enrolls and removes browser Web Push",()=>{const settings=read("app/settings/page.tsx"),route=read("app/api/v1/push-subscriptions/route.ts"),worker=read("public/sw.js");assert.match(settings,/Notification\.requestPermission/);assert.match(settings,/pushManager\.subscribe/);assert.match(settings,/current\.unsubscribe/);assert.match(route,/vapidPublicKey/);assert.match(route,/deletePushSubscription/);assert.match(worker,/addEventListener\("push"/);assert.match(worker,/showNotification/);assert.match(worker,/notificationclick/) });
test("automations and notifications reconnect to durable live snapshots",()=>{const automation=read("app/automations/page.tsx"),notifications=read("app/notifications/page.tsx"),runRoute=read("app/api/v1/automations/[id]/runs/[runId]/route.ts");for(const route of ["app/api/v1/automations/[id]/events/route.ts","app/api/v1/notifications/events/route.ts"]){const stream=read(route);assert.match(stream,/text\/event-stream/);assert.match(stream,/retry: 3000/);assert.match(stream,/: heartbeat/);assert.match(stream,/event: snapshot/)}assert.match(automation,/new EventSource/);assert.match(automation,/runAction/);assert.match(notifications,/new EventSource/);assert.match(runRoute,/cancelAutomationRun/);assert.match(runRoute,/retryAutomationRun/)});
test("notification center filters, groups, marks read, and navigates to related objects",()=>{const page=read("app/notifications/page.tsx");assert.match(page,/read-all/);assert.match(page,/deliveryAction/);assert.match(page,/related_type/);assert.match(page,/No notifications match this filter/)});

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

test("offline file captures preserve blobs until asset and capture persistence complete",()=>{
  const queue=read("app/lib/offlineQueue.ts"),state=read("app/components/AppState.tsx");assert.match(queue,/captureStore="capture-blobs"/);assert.match(queue,/blob:Blob/);assert.match(queue,/new File\(\[item\.blob\]/);assert.match(queue,/assetIds:\[data\.assets\[0\]\.id\]/);assert.match(queue,/delete\(item\.id\)/);assert.match(state,/queueOfflineCapture\(capture,file\)/);
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

test("Settings connects Google and selects discovered calendars",()=>{const page=read("app/settings/page.tsx"),callback=read("app/api/v1/integrations/google/callback/route.ts");assert.match(page,/\/api\/v1\/integrations\/google\/connect/);assert.match(page,/Refresh calendars/);assert.match(page,/calendarIds/);assert.match(page,/Disconnect/);assert.match(callback,/completeGoogleOAuth/) });

test("Calendar sync exposes diagnostics and conflict counts",()=>{const page=read("app/settings/page.tsx"),route=read("app/api/v1/calendar-sync/route.ts");assert.match(page,/Sync now/);assert.match(page,/conflicts\.length/);assert.match(page,/lastSyncedAt/);assert.match(route,/pullGoogleCalendar/);assert.match(route,/calendarSyncStatus/) });

test("Calendar reviews sync conflicts and chooses a Google destination",()=>{const page=read("app/calendar/page.tsx"),route=read("app/api/v1/calendar-sync/conflicts/[id]/route.ts");for(const label of ["Keep LifeOS","Keep Google","Keep both","Google calendar"])assert.match(page,new RegExp(label));assert.match(page,/googleCalendarId/);assert.match(route,/resolveCalendarConflict/);assert.match(read("server/calendar-sync.mjs"),/calendar_sync_writes/) });

test("Automations use durable API state and runs",()=>{
  const page=read("app/automations/page.tsx"),builder=read("app/automations/AutomationBuilder.tsx");
  assert.match(page,/\/api\/v1\/automations/);
  assert.match(page,/\/preview/);
  assert.match(page,/\/runs/);
  assert.match(page,/metrics/);
  for(const action of ["Edit","Duplicate","Delete","Preview"])assert.match(page,new RegExp(action));
  for(const control of ["Add condition","Add action","Move step","Remove step"])assert.match(builder,new RegExp(control));
  assert.match(page,/step-history/);
  assert.match(page,/Test run/);
  assert.match(read("app/api/v1/automations/[id]/route.ts"),/deleteAutomation/);
  assert.doesNotMatch(page,/Stewie Channel Pipeline/);
});

test("knowledge graph exposes accessible visual, table, paths, and provenance",()=>{const page=read("app/graph/page.tsx"),shell=read("app/components/ModuleShell.tsx");assert.match(page,/\/api\/v1\/knowledge-graph/);assert.match(page,/role="img"/);assert.match(page,/Accessible relationship table/);assert.match(page,/Trace a path/);assert.match(page,/provenance/);assert.match(page,/Open source/);assert.match(shell,/\["Graph","\/graph"/)});
test("custom dashboard builder persists responsive keyboard layouts",()=>{const page=read("app/dashboards/page.tsx"),shell=read("app/components/ModuleShell.tsx");assert.match(page,/\/api\/v1\/dashboards/);for(const label of ["Move dashboard left","Add widget","Save layout","Duplicate","Delete","Narrower","Wider","Shorter","Taller"])assert.match(page,new RegExp(label));assert.match(page,/gridColumn/);assert.match(shell,/\["Dashboards","\/dashboards"/)});

test("tasks and events expose durable reminder controls",()=>{
  for(const file of ["app/tasks/page.tsx","app/calendar/page.tsx"])assert.match(read(file),/type="datetime-local"/);
  assert.match(read("server/worker.mjs"),/deliverDueReminders/);
});

test("Calendar edits normalized event time and recurrence",()=>{const page=read("app/calendar/page.tsx"),route=read("app/api/v1/events/[id]/route.ts");assert.match(page,/startAt:start\.toISOString/);assert.match(page,/resolvedOptions\(\)\.timeZone/);assert.match(page,/All day/);assert.match(page,/frequency/);assert.doesNotMatch(page,/July 2026/);assert.match(route,/deleteEvent/) });

test("Vault exposes reviewable Draft optimization",()=>{
  const vault=read("app/vault/page.tsx");assert.match(vault,/Optimize draft/);assert.match(vault,/Optimization review/);assert.match(vault,/Apply proposal/);assert.match(vault,/\/optimizations/);assert.match(read("server/worker.mjs"),/note-optimize/);
});

test("Tutor resumes sessions and inserts messages through the API",()=>{
  const panel=read("app/components/TutorPanel.tsx");assert.match(panel,/subjectId=/);assert.match(panel,/sessionId/);assert.match(panel,/\/tutor\/messages\/\$\{message\.id\}\/insert/);assert.match(panel,/insertedNoteId/);
});

test("Settings exposes opt-in local analytics and deletion",()=>{const page=read("app/settings/page.tsx"),route=read("app/api/v1/analytics/route.ts"),shell=read("app/components/ModuleShell.tsx");assert.match(page,/Local usage analytics/);assert.match(page,/Delete analytics/);assert.match(page,/Off by default/);assert.match(page,/never note or capture content/);assert.match(route,/setAnalyticsEnabled/);assert.match(route,/deleteAnalytics/);assert.match(shell,/event:"navigation"/) });
