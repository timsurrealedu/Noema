const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("core frontend routes exist",()=>{
  for(const route of ["automations","calendar","capture","coding","settings","study","tasks","vault"])
    assert.ok(fs.existsSync(path.join(root,"app",route,"page.tsx")),route);
});

test("capture review identifies vault-note proposals",()=>{const state=read("app/components/AppState.tsx"),page=read("app/capture/page.tsx");assert.match(state,/vault\.note\.create/);assert.match(page,/Vault note/)});
test("local worker loads the same environment as Next development",()=>assert.match(JSON.parse(read("package.json")).scripts.worker,/--env-file-if-exists=\.env\.local/));
test("capture review refreshes its version after AI processing",()=>assert.match(read("app/components/AppState.tsx"),/version:job\.result\?\.captureVersion/));
test("capture job results expose their safe capture version",()=>assert.match(read("app/api/v1/jobs/[id]/route.ts"),/captureVersion:job\.result\.captureVersion/));

test("coding compiler workspace exists",()=>{
  assert.ok(fs.existsSync(path.join(root,"app","coding","compiler","page.tsx")));
  assert.match(read("app/coding/compiler/page.tsx"),/\/api\/v1\/compiler\/run/);
});

test("compiler requires an exact reviewable approval before execution",()=>{
  const page=read("app/coding/compiler/page.tsx"),route=read("app/api/v1/compiler/run/route.ts");assert.match(page,/\/api\/v1\/approvals/);assert.match(page,/Affected files/);assert.match(page,/Approval required/);assert.match(route,/consumeApproval/);
});

test("Coding dashboard uses persisted repositories and approvals",()=>{const page=read("app/coding/page.tsx");assert.match(page,/\/api\/v1\/approvals/);assert.match(page,/\/api\/v1\/repositories/);assert.match(page,/NOEMA_REPOSITORY_ROOTS/);assert.match(page,/Approval history/);assert.doesNotMatch(page,/Run staging database migration|Approve once|const sessions=/) });

test("mobile repository IDE reviews edits, commands, commits, and reverts",()=>{const page=read("app/coding/repositories/[id]/page.tsx"),route=read("app/api/v1/repositories/[id]/route.ts"),gitRoute=read("app/api/v1/repositories/[id]/git/route.ts"),service=read("server/repositories.mjs");for(const value of [/repository\.edit/,/repository\.command/,/repository\.\$\{input\.action\}/,/mobile-toolbar/,/Working-tree review/])assert.match(page,value);assert.match(route,/consumeApproval/);assert.match(gitRoute,/repository\.\$\{input\.action\}/);assert.match(service,/Symlink escape/);assert.match(service,/VERSION_CONFLICT/);assert.match(service,/--unshare-all/);assert.match(service,/Command is not allowlisted/)});
test("synced repository editor exposes focus-safe mobile navigation",()=>{const page=read("app/coding/repositories/[id]/page.tsx");for(const control of ["Home","End","Move cursor up","Indent selection","Outdent selection","Undo","Redo","event.shiftKey"])assert.match(page,new RegExp(control))});

test("Vault and compiler expose the contextual tutor",()=>{
  for(const file of ["app/vault/page.tsx","app/coding/compiler/page.tsx"])assert.match(read(file),/TutorPanel/);
  const panel=read("app/components/TutorPanel.tsx");assert.match(panel,/noema-tutor-mobile-mode/);assert.match(panel,/Apply to editor/);assert.match(panel,/Add to note/);
});

test("shared shell exposes keyboard search and accessible navigation",()=>{
  const shell=read("app/components/ModuleShell.tsx");
  assert.match(shell,/metaKey\|\|event\.ctrlKey/);
  assert.match(shell,/\/api\/v1\/search\?q=/);
  assert.match(shell,/data\.events\.map/);
  assert.match(shell,/\?open=\$\{item\.id\}/);
  assert.match(shell,/\/api\/v1\/notifications/);
  assert.match(shell,/\/read`,\{method:"POST"/);
  assert.match(read("app/components/ModalDialog.tsx"),/aria-label="Search Noema"/);
  assert.match(shell,/Skip to main content/);
});

test("mobile navigation exposes Coding and Automations",()=>{for(const file of ["app/components/ModuleShell.tsx","app/page.tsx"]){const page=read(file);assert.match(page,/\["Coding","\/coding",Code\]/);assert.match(page,/\["Automations","\/automations",Lightning\]/)}});
test("tablet capture and navigation controls avoid credential UI and expose capture tools",()=>{const today=read("app/page.tsx"),shell=read("app/components/ModuleShell.tsx"),css=read("app/globals.css");assert.match(today,/name="quick-capture"/);assert.match(today,/autoComplete="off"/);assert.match(today,/\["Settings","\/settings",Gear\]/);assert.match(shell,/\["Settings","\/settings",Gear\]/);assert.match(css,/\.mobile-nav \.capture-nav svg\{[^}]*background:transparent/);assert.match(css,/\.capture-tool\{display:grid/)});
test("task view selector is functional and selected view is not repeated on mobile",()=>{const tasks=read("app/tasks/page.tsx"),css=read("app/globals.css");assert.match(tasks,/<select[^>]*aria-label="Task view"/);assert.match(tasks,/onChange=\{event=>setFilter\(event\.target\.value\)\}/);assert.match(css,/\.task-list \.list-title h3\{display:none\}/)});

test("Vault note IDs work without crypto.randomUUID",()=>{const vault=read("app/vault/page.tsx"),ids=read("app/lib/id.ts");assert.match(vault,/createId\(\)/);assert.match(ids,/typeof crypto\.randomUUID===\"function\"/);assert.match(ids,/crypto\.getRandomValues/)});
test("Vault opens tree notes even before their summaries hydrate",()=>{const organizer=read("app/components/VaultOrganizer.tsx"),vault=read("app/vault/page.tsx");assert.match(organizer,/notes\.find\(note=>note\.id===id\)\|\|/);assert.match(vault,/Could not open note/);assert.doesNotMatch(vault,/catch\{\}/)});

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
test("note editors insert GFM tables and render LaTeX",()=>{const toolbar=read("app/components/MarkdownToolbar.tsx"),content=read("app/components/MarkdownContent.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),vault=read("app/vault/page.tsx");assert.match(toolbar,/Insert table/);assert.match(toolbar,/Insert display equation/);assert.match(content,/remarkGfm/);assert.match(content,/remarkMath/);assert.match(content,/rehypeKatex/);assert.match(mixed,/MarkdownToolbar/);assert.match(mixed,/MarkdownContent/);assert.match(vault,/MarkdownToolbar/)});
test("note editors share deterministic mobile Markdown behavior",()=>{const behavior=read("app/lib/markdownEdit.ts");for(const token of ["pairs","Backspace","Tab","shiftKey","Enter","xX"] )assert.match(behavior,new RegExp(token));for(const file of ["app/components/MixedNoteEditor.tsx","app/vault/page.tsx"])assert.match(read(file),/markdownKey/)});
test("full and mixed note editors provide canonical wikilink completion",()=>{const completion=read("app/components/WikilinkCompletion.tsx");assert.match(completion,/useAppState/);assert.match(completion,/\[\[/);assert.match(completion,/setRangeText/);for(const file of ["app/components/MixedNoteEditor.tsx","app/vault/page.tsx"])assert.match(read(file),/WikilinkCompletion/)});
test("note attachments use canonical assets and insert Markdown at the caret",()=>{const attachment=read("app/components/NoteAttachmentButton.tsx"),vault=read("app/vault/page.tsx");assert.match(attachment,/\/api\/v1\/assets/);assert.match(attachment,/setRangeText/);assert.match(attachment,/image\//);assert.match(vault,/NoteAttachmentButton/)});
test("notes default to preview while tutor and vault panes remain adjustable",()=>{const tutor=read("app/components/TutorPanel.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),vault=read("app/vault/page.tsx"),organizer=read("app/components/VaultOrganizer.tsx");assert.match(tutor,/MarkdownContent text=\{message\.text\}/);assert.match(tutor,/resizeWidth/);for(const mode of ["minimized","sheet","full"])assert.match(tutor,new RegExp(`"${mode}"`));assert.match(mixed,/setPreview\]=useState\(true\)/);assert.match(vault,/\("read"\)/);assert.match(organizer,/noema-vault-drawer/);assert.match(organizer,/aria-expanded=\{drawer\}/)});
test("Obsidian sync is stable and read-only",()=>{const sync=read("scripts/sync-obsidian.mjs");assert.match(sync,/createHash/);assert.match(sync,/Obsidian ·/);assert.match(sync,/readFileSync/);assert.doesNotMatch(sync,/writeFile|unlink|rename|rmSync/)});
test("vault tasks expose live counts, source links, Jakarta scheduling, and discriminated calendar items",()=>{const tasks=read("app/tasks/page.tsx"),calendar=read("app/calendar/page.tsx"),state=read("app/components/AppState.tsx");assert.doesNotMatch(tasks,/Four tasks are ready/);assert.match(tasks,/counts=Object\.fromEntries/);assert.match(tasks,/Asia\/Jakarta/);assert.match(tasks,/vaultSource\.relativePath/);assert.match(tasks,/Open source note/);assert.match(state,/kind:"event"/);assert.match(state,/kind:"task"/);assert.match(calendar,/calendarItems\.filter\(item=>item\.kind==="task"\)/)});
test("mixed handwriting editor preserves offline strokes and pen-first input",()=>{const editor=read("app/components/InkEditor.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),ink=read("app/lib/ink.ts"),queue=read("app/lib/offlineQueue.ts"),worker=read("server/worker/handlers/handwriting-ocr.mjs");assert.match(editor,/getCoalescedEvents/);assert.match(editor,/pointerType==="pen"/);assert.match(editor,/saveInkDraft/);for(const tool of ["pen","highlighter","eraser","lasso"])assert.match(editor,new RegExp(`"${tool}"`));assert.match(mixed,/Move block up/);assert.match(mixed,/Duplicate block/);assert.match(queue,/ink-drafts/);assert.match(ink,/pressure:event\.pressure>0/);assert.match(worker,/strokesToPng/);assert.match(worker,/mimeType:"image\/png"/);assert.doesNotMatch(worker,/mimeType:"image\/svg\+xml"/)});
test("mixed note editor inserts an ink block at the active Markdown caret",()=>{const mixed=read("app/components/MixedNoteEditor.tsx");assert.match(mixed,/Insert ink at caret/);assert.match(mixed,/selectionStart/);assert.match(mixed,/value\.slice\(0,caret\)/);assert.match(mixed,/ids\.splice\(index\+1,0,inkId,afterId\)/)});
test("ink exposes world-edit transforms and geometric tool types",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const tool of ["rectangle","ellipse","arrow","rotateStroke","scaleStroke","formatVersion:2","coordinateSpace:\"world\"","Ruler snap"])assert.match(`${editor}\n${ink}`,new RegExp(tool))});
test("ink replay drops malformed strokes before rendering or transforms",()=>{const ink=read("app/lib/ink.ts"),editor=read("app/components/InkEditor.tsx");assert.match(ink,/sanitizeStrokes/);assert.match(ink,/if\(!a\|\|!b\)return ""/);assert.match(editor,/sanitizeStrokes\(initial\)/);assert.match(editor,/sanitizeStrokes\(draft\?\.strokes\)/)});
test("ink touch gestures pan, pinch, and support two-finger double-tap undo",()=>{const editor=read("app/components/InkEditor.tsx");for(const token of ["touches","pinchDistance","lastTwoTap","pointerType===\"touch\"","viewBox","undo\(\)"])assert.match(editor,new RegExp(token))});
test("Vault uses an Obsidian-style tree with breadcrumbs and visible ink entry points",()=>{const page=read("app/vault/page.tsx"),organizer=read("app/components/VaultOrganizer.tsx");assert.match(page,/VaultOrganizer/);assert.match(organizer,/vault-sources\/\$\{id\}\/tree/);assert.match(organizer,/Vault folders/);assert.match(organizer,/Breadcrumb/);assert.match(organizer,/Draw in/);assert.match(organizer,/entries\/move/);assert.match(organizer,/entries\/trash/);assert.match(organizer,/New note/)});
test("vault root heading does not repeat the selected source breadcrumb",()=>{assert.match(read("app/globals.css"),/vault-breadcrumbs:not\(:has\(span\)\)\{display:none\}/)});
test("Vault organizer stays bounded and search-led on tablet",()=>{const css=read("app/globals.css");assert.match(css,/\.obsidian-vault\{position:relative/);assert.match(css,/\.obsidian-vault>header\{display:grid;grid-template-columns:auto minmax\(0,1fr\) auto/);assert.match(css,/\.vault-organizer-search\{grid-column:1\/-1/)});
test("PDF annotation workspace persists page coordinates, comments, links, and exports",()=>{const page=read("app/assets/[id]/annotate/page.tsx");assert.match(page,/\/annotations/);assert.match(page,/geometry/);assert.match(page,/Link type/);assert.match(page,/Export/)});
test("job streams resume by event ID and emit heartbeats",()=>{const stream=read("app/api/v1/jobs/[id]/events/route.ts"),retry=read("app/api/v1/jobs/[id]/retry/route.ts");assert.match(stream,/last-event-id/);assert.match(stream,/id: \$\{id\}/);assert.match(stream,/: heartbeat/);assert.match(retry,/retryJob/)});
test("notification deliveries expose durable status and retry controls",()=>{const route=read("app/api/v1/notification-deliveries/[id]/route.ts"),push=read("server/push.mjs");assert.match(route,/retryDelivery/);assert.match(route,/resolveDelivery/);assert.match(push,/permanent-failure/);assert.match(push,/status===404\|\|status===410/)});
test("Settings enrolls and removes browser Web Push",()=>{const settings=read("app/settings/page.tsx"),route=read("app/api/v1/push-subscriptions/route.ts"),worker=read("public/sw.js");assert.match(settings,/Notification\.requestPermission/);assert.match(settings,/pushManager\.subscribe/);assert.match(settings,/current\.unsubscribe/);assert.match(route,/vapidPublicKey/);assert.match(route,/deletePushSubscription/);assert.match(worker,/addEventListener\("push"/);assert.match(worker,/showNotification/);assert.match(worker,/notificationclick/) });
test("automations and notifications reconnect to durable live snapshots",()=>{const automation=read("app/automations/page.tsx"),notifications=read("app/notifications/page.tsx"),runRoute=read("app/api/v1/automations/[id]/runs/[runId]/route.ts");for(const route of ["app/api/v1/automations/[id]/events/route.ts","app/api/v1/notifications/events/route.ts"]){const stream=read(route);assert.match(stream,/text\/event-stream/);assert.match(stream,/retry: 3000/);assert.match(stream,/: heartbeat/);assert.match(stream,/event: snapshot/)}assert.match(automation,/new EventSource/);assert.match(automation,/runAction/);assert.match(notifications,/new EventSource/);assert.match(runRoute,/cancelAutomationRun/);assert.match(runRoute,/retryAutomationRun/)});
test("notification center filters, groups, marks read, and navigates to related objects",()=>{const page=read("app/notifications/page.tsx");assert.match(page,/read-all/);assert.match(page,/deliveryAction/);assert.match(page,/related_type/);assert.match(page,/No notifications match this filter/)});

test("offline mutations queue durably and replay idempotently",()=>{
  const queue=read("app/lib/offlineQueue.ts"),pwa=read("app/components/PWARegister.tsx"),worker=read("public/sw.js");
  assert.match(queue,/databaseName="noema-offline-v1"/);
  assert.match(queue,/idempotencyKey/);
  assert.match(queue,/dependencies\.some/);
  assert.match(queue,/locks\.request\("noema-offline-replay"/);
  assert.match(queue,/status:response\.status===409\?"conflict"/);
  assert.match(pwa,/addEventListener\("online"/);
  assert.match(worker,/noema-mutations/);
});
test("expired sessions redirect without looping on auth pages",()=>{const state=read("app/components/AppState.tsx");assert.match(state,/error\.status===401/);assert.match(state,/\['\/login','\/join'\]\.includes\(location\.pathname\)/)});

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
test("login only marks cookies Secure on HTTPS",()=>{const route=read("app/api/v1/auth/login/route.ts");assert.match(route,/new URL\(request\.url\)\.protocol===\"https:\"/);assert.doesNotMatch(route,/NODE_ENV===\"production\"/)});
test("login offers explicit persistent or device-session cookies",()=>{const login=read("app/login/page.tsx"),route=read("app/api/v1/auth/login/route.ts");assert.match(login,/Keep me signed in on this device/);assert.match(login,/autoComplete="username"/);assert.doesNotMatch(login,/tim@example\.com/);assert.match(route,/input\.remember\s*!==\s*false/);assert.match(route,/remember\s*\?\s*`; Max-Age=/)});

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

test("Calendar reviews sync conflicts and chooses a Google destination",()=>{const page=read("app/calendar/page.tsx"),route=read("app/api/v1/calendar-sync/conflicts/[id]/route.ts");for(const label of ["Keep Noema","Keep Google","Keep both","Google calendar"])assert.match(page,new RegExp(label));assert.match(page,/googleCalendarId/);assert.match(route,/resolveCalendarConflict/);assert.match(read("server/calendar-sync.mjs"),/calendar_sync_writes/) });

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
test("tasks and events expose durable reminder controls",()=>{
  for(const file of ["app/tasks/page.tsx","app/calendar/page.tsx"])assert.match(read(file),/type="datetime-local"/);
  assert.match(read("server/worker/maintenance/reminders.mjs"),/deliverDueReminders/);
});

test("Calendar edits normalized event time and recurrence",()=>{const page=read("app/calendar/page.tsx"),route=read("app/api/v1/events/[id]/route.ts");assert.match(page,/startAt:start\.toISOString/);assert.match(page,/resolvedOptions\(\)\.timeZone/);assert.match(page,/All day/);assert.match(page,/frequency/);assert.doesNotMatch(page,/July 2026/);assert.match(route,/deleteEvent/) });

test("Vault exposes reviewable Draft optimization",()=>{
  const vault=read("app/vault/page.tsx");assert.match(vault,/Optimize draft/);assert.match(vault,/Optimization review/);assert.match(vault,/Apply proposal/);assert.match(vault,/\/optimizations/);assert.match(read("server/worker.mjs"),/note-optimize/);
});

test("Tutor resumes sessions and inserts messages through the API",()=>{
  const panel=read("app/components/TutorPanel.tsx");assert.match(panel,/subjectId=/);assert.match(panel,/sessionId/);assert.match(panel,/\/tutor\/messages\/\$\{message\.id\}\/insert/);assert.match(panel,/insertedNoteId/);
});

test("Settings exposes opt-in local analytics and deletion",()=>{const page=read("app/settings/page.tsx"),route=read("app/api/v1/analytics/route.ts"),shell=read("app/components/ModuleShell.tsx");assert.match(page,/Local usage analytics/);assert.match(page,/Delete analytics/);assert.match(page,/Off by default/);assert.match(page,/never note or capture content/);assert.match(route,/setAnalyticsEnabled/);assert.match(route,/deleteAnalytics/);assert.match(shell,/event:"navigation"/) });
test("Vault notes support focused fullscreen reading",()=>{const page=read("app/vault/page.tsx"),css=read("app/globals.css");assert.match(page,/Open note fullscreen/);assert.match(css,/note-workspace\.fullscreen/);assert.match(css,/mobile-nav\{display:none\}/)});
test("Settings manages encrypted AI agents in app",()=>{const settings=read("app/settings/page.tsx"),agents=read("app/components/AIAgentSettings.tsx");assert.match(settings,/AIAgentSettings/);assert.match(agents,/Stored encrypted/);assert.doesNotMatch(agents,/value=\{.*apiKey/)});
test("Settings requires explicit confirmation after read-only LifeOS inventory",()=>{const panel=read("app/components/LifeOSMigration.tsx"),route=read("app/api/v1/migrations/lifeos/route.ts");assert.match(panel,/Read-only inventory/);assert.match(panel,/IMPORT_LIFEOS_SOURCE/);assert.match(route,/confirmImport/);assert.match(route,/prepareVaultActivation/);assert.doesNotMatch(`${panel}\n${route}`,/inbox\.md/)});
test("mobile compiler exposes formatting and cursor controls",()=>{const page=read("app\/coding\/compiler\/page.tsx");assert.match(page,/Indent selection/);assert.match(page,/caret-joystick/);assert.match(page,/Move cursor up/)});
test("compiler Scratch buffers recover independently per language",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/noema-scratch-/);assert.match(page,/localStorage\.getItem/);assert.match(page,/localStorage\.setItem/);assert.match(page,/Scratch/)});
test("compiler highlighting is lazy and keeps the textarea fallback",()=>{const page=read("app/coding/compiler/page.tsx"),preview=read("app/components/LazySyntaxPreview.tsx");assert.match(page,/dynamic\(/);assert.match(page,/textarea/);assert.match(page,/Show highlighting/);assert.match(preview,/token/);assert.doesNotMatch(preview,/dangerouslySetInnerHTML/)});
test("compiler starts highlighted and preserves indentation on Enter",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/setHighlight\]=useState\(true\)/);assert.match(page,/event\.key!==\"Enter\"/);assert.match(page,/match\(\/\^\\s\*\//)});
test("automation and Settings share themed form controls",()=>{const css=read("app/globals.css");assert.match(css,/\.automation-builder :is\(input,select,textarea\)/);assert.match(css,/\.settings-content :is\(input,select,textarea\)/)});
test("full tutor allocates its body to the conversation",()=>assert.match(read("app/globals.css"),/\.tutor-panel\.full\{grid-template-rows:64px minmax\(0,1fr\) auto/));
test("Canvas persists versioned workspace objects with pointer, keyboard, and accessible list controls",()=>{const page=read("app/canvas/page.tsx"),engine=read("app/components/InfiniteCanvas.tsx"),routes=[read("app/api/v1/canvases/route.ts"),read("app/api/v1/canvases/[id]/route.ts")].join("\n");assert.match(page,/dynamic\(/);assert.match(engine,/onWheel/);assert.match(engine,/onPointerDown/);assert.match(engine,/ArrowLeft/);assert.match(engine,/longPress/);assert.match(engine,/Undo/);assert.match(engine,/Redo/);assert.match(engine,/Accessible object list/);assert.match(engine,/useAppState/);assert.match(engine,/refId/);assert.match(engine,/version/);assert.match(routes,/requireWorkspace/);assert.match(routes,/saveCanvas/)});
