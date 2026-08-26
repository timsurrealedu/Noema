const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const files=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);

test("core frontend routes exist",()=>{
  for(const route of ["calendar","capture","settings","vault"])
    assert.ok(fs.existsSync(path.join(root,"app",route,"page.tsx")),route);
});

test("capture review identifies vault-note proposals",()=>{const state=read("app/components/AppState.tsx"),page=read("app/capture/page.tsx");assert.match(state,/vault\.note\.create/);assert.match(page,/Vault note/)});
test("capture timestamps include weekday and omit the current year",()=>{const page=read("app/capture/page.tsx");assert.match(page,/weekday:\s*"long"/);assert.match(page,/getFullYear/)});
test("Home task rows keep title, urgency, exact date, and touch-safe actions together",()=>{const page=read("app/page.tsx"),css=read("app/globals.css");for(const token of ["task-primary-meta","task-overdue-relative","task-due-exact","row-menu"])assert.match(page,new RegExp(token));assert.match(css,/\.app-shell \.task-list article\{grid-template-columns:44px minmax\(0,1fr\) 44px/);assert.match(css,/\.app-shell \.task-check,\.app-shell \.row-menu\{width:44px;height:44px/)});
test("Today routes Quick note into integrated Vault ink",()=>{const today=read("app/page.tsx"),capture=read("app/components/HandwritingCapture.tsx"),recorder=read("app/components/DurableRecorder.tsx"),css=read("app/globals.css");assert.match(today,/aria-label="Write a handwritten note"/);assert.match(today,/<HandwritingCapture/);assert.match(capture,/<strong>Quick note<\/strong>/);assert.match(capture,/href="\/vault\?new=ink"/);assert.doesNotMatch(capture,/Open Integrated Ink & Text Note/);assert.match(today,/DurableRecorder/);assert.match(recorder,/capture-tool capture-voice/);assert.doesNotMatch(css,/\.app-shell \.capture-voice\{display:none\}/);assert.match(css,/@media\(max-width:430px\)\{\.app-shell \.capture\{flex-wrap:wrap/);assert.doesNotMatch(css,/capture-handwriting\{display:none/);for(const value of ["Choose folder","Draft","/api/v1/handwriting-notes","Done"])assert.match(capture,new RegExp(value));assert.match(capture,/disabled=\{[^}]*!strokes\.length/)});
test("voice recordings are durable across navigation and crashes",()=>{const recorder=read("app/components/DurableRecorder.tsx"),queue=read("app/lib/offlineQueue.ts");for(const token of ["saveRecordingChunk","loadRecording","deleteRecording","Pause","Resume recording","Finish recording","Unfinished recording"])assert.match(recorder,new RegExp(token));for(const token of ["recording-chunks","recordingId"])assert.match(queue,new RegExp(token));});
test("handwriting capture uses durable recovery and normalized world coordinates",()=>{const capture=read("app/components/HandwritingCapture.tsx"),editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");assert.match(capture,/normalizeInk/);assert.match(editor,/saveInkDraft/);assert.match(editor,/capture/);assert.match(ink,/coordinateSpace:"world"/)});
test("handwriting canvas navigates and edits in world coordinates",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const value of [/onWheel=/,/"pan","Pan"/,/aria-label="Fit drawing"/,/screenToWorld/,/fitInkView/,/translateStroke/,/snapInkPoint/])assert.match(editor+ink,value);assert.match(editor,/selected\.includes\(stroke\.id\).*translateStroke/s)});
test("ink selection handles and touch input match stylus interactions",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const value of [/startTransform\(event,"scale"\)/,/startTransform\(event,"rotate"\)/,/selectionBounds/,/penUpAt/,/touches\.current\.size===2/])assert.match(editor+ink,value);assert.doesNotMatch(ink,/pointerType!=="touch"/)});
test("handwriting notes expose durable creation and batch-processing endpoints",()=>{const route=read("app/api/v1/handwriting-notes/route.ts"),process=read("app/api/v1/captures/process-pending/route.ts"),service=read("server/handwriting.mjs");assert.match(route,/requireWorkspace\(request,"editor"\)/);assert.match(route,/idempotent/);assert.match(process,/processPendingHandwriting/);assert.match(service,/dedupeKey:`handwriting-intake:/);assert.match(service,/queueOcr:false/)});
test("Capture Done history shows handwriting provenance and its note link",()=>{const page=read("app/capture/page.tsx"),state=read("app/components/AppState.tsx");for(const value of ["Done","AI action","Confidence","Source ink","Open note"])assert.match(page,new RegExp(value));assert.match(state,/handwriting\?:/)});
test("Vault New note action is icon-only",()=>{const vault=read("app/components/VaultOrganizer.tsx");assert.match(vault,/aria-label="New note"/);assert.doesNotMatch(vault,/<FilePlus\/>New note/)});
test("Vault New note directly creates one mixed note",()=>{const vault=read("app/components/VaultOrganizer.tsx");assert.match(vault,/aria-label="New note"[^>]*onClick=\{\(\)=>void create\(\)\}/);for(const value of ["createMenu","note-type-dialog","Choose note type","Typed note"])assert.doesNotMatch(vault,new RegExp(value))});
test("closed Vault sidebar leaves its content pane full width",()=>{const css=read("app/globals.css");assert.match(css,/\.obsidian-vault:not\(\.drawer-open\) \.obsidian-vault-body\{grid-template-columns:minmax\(0,1fr\)\}/)});
test("local development supervises Next and a visibly running worker",()=>{const scripts=JSON.parse(read("package.json")).scripts,dev=read("scripts/dev.mjs"),worker=read("server/worker.mjs");assert.equal(scripts.dev,"node scripts/dev.mjs");assert.match(dev,/dev:web/);assert.match(dev,/server\/worker\.mjs/);assert.match(dev,/stopping development services/);assert.match(worker,/\[worker\] started/);assert.match(scripts.worker,/--env-file-if-exists=\.env\.local/)});
test("capture review refreshes its version after AI processing",()=>assert.match(read("app/components/AppState.tsx"),/version:job\.result\?\.captureVersion/));
test("capture job results expose their safe capture version",()=>assert.match(read("app/api/v1/jobs/[id]/route.ts"),/captureVersion:job\.result\.captureVersion/));

test("coding compiler workspace exists",()=>{
  assert.ok(fs.existsSync(path.join(root,"app","coding","compiler","page.tsx")));
  assert.match(read("app/coding/compiler/page.tsx"),/\/api\/v1\/compiler\/run/);
});

test("compiler executes in one tap without weakening repository approvals",()=>{
  const page=read("app/coding/compiler/page.tsx"),route=read("app/api/v1/compiler/run/route.ts");assert.doesNotMatch(page,/\/api\/v1\/approvals/);assert.doesNotMatch(route,/consumeApproval|requireMfa/);assert.match(route,/requireWorkspace\(request,"editor"\)/);
});
test("compiler Saved mode lists, opens, creates, and explicitly saves files",()=>{const page=read("app/coding/compiler/page.tsx");for(const value of ["Scratch","Saved","/api/v1/compiler/files","Save file","New file"])assert.match(page,new RegExp(value));for(const route of ["app/api/v1/compiler/languages/route.ts","app/api/v1/compiler/files/route.ts","app/api/v1/compiler/files/content/route.ts"])assert.ok(fs.existsSync(path.join(root,route))) });

test("Coding page renders compiler workspace directly",()=>{const page=read("app/coding/page.tsx");assert.match(page,/CompilerPage/)});

test("mobile repository IDE reviews edits, commands, commits, and reverts",()=>{const page=read("app/coding/repositories/[id]/page.tsx"),route=read("app/api/v1/repositories/[id]/route.ts"),gitRoute=read("app/api/v1/repositories/[id]/git/route.ts"),service=read("server/repositories.mjs");for(const value of [/repository\.edit/,/repository\.command/,/repository\.\$\{input\.action\}/,/mobile-toolbar/,/Working-tree review/])assert.match(page,value);assert.match(route,/consumeApproval/);assert.match(gitRoute,/repository\.\$\{input\.action\}/);assert.match(service,/Symlink escape/);assert.match(service,/VERSION_CONFLICT/);assert.match(service,/--unshare-all/);assert.match(service,/Command is not allowlisted/)});
test("synced repository editor exposes focus-safe mobile navigation",()=>{const page=read("app/coding/repositories/[id]/page.tsx");for(const control of ["Home","End","Move cursor up","Indent selection","Outdent selection","Undo","Redo","event.shiftKey"])assert.match(page,new RegExp(control))});

test("Vault and compiler expose the contextual tutor",()=>{
  for(const file of ["app/vault/page.tsx","app/coding/compiler/page.tsx"])assert.match(read(file),/TutorPanel/);
  const panel=read("app/components/TutorPanel.tsx");assert.match(panel,/noema-tutor-mobile-mode/);assert.match(panel,/Apply to editor/);assert.match(panel,/Add to note/);
});

test("shared shell exposes keyboard search and accessible navigation",()=>{
  const shell=read("app/components/ModuleShell.tsx");
  const notifications=read("app/components/NotificationButton.tsx");
  assert.match(shell,/metaKey\|\|event\.ctrlKey/);
  assert.match(shell,/\/api\/v1\/search\?q=/);
  assert.match(shell,/data\.events\.map/);
  assert.match(shell,/\?open=\$\{item\.id\}/);
  assert.match(notifications,/\/api\/v1\/notifications/);
  assert.match(notifications,/\/read`,\{method:"POST"/);
  assert.match(read("app/components/ModalDialog.tsx"),/ariaLabel="Search Noema"/);
  assert.match(shell,/Skip to main content/);
});
test("shared navigation groups secondary modules in an accessible More menu",()=>{const shell=read("app/components/ModuleShell.tsx"),css=read("app/globals.css");for(const label of ["Study","Projects","Automations","Dashboards","Plugins","Collaboration","Help","Settings"])assert.match(shell,new RegExp(`\\["${label}"`));assert.match(shell,/ariaLabel="More navigation"/);assert.match(shell,/aria-haspopup="dialog"/);assert.match(shell,/primaryNav\.slice\(0,4\)/);assert.match(css,/\.more-dialog>nav/)});
test("Home mobile navigation matches the shared four-item bar and More menu",()=>{const home=read("app/page.tsx");assert.match(home,/primaryNav\.slice\(0,4\)/);assert.match(home,/ariaLabel="More navigation"/);assert.match(home,/aria-haspopup="dialog"/);assert.doesNotMatch(home,/\[\["Home","\/",House\][^\n]+\["Coding","\/coding",Code\]\]/)});
test("Help links the capture, note, calendar, ink, and PDF workflows",()=>{const help=read("app/help/page.tsx");for(const label of ["Capture and review","Write and organize notes","Plan time and reminders","Create an ink note","Open a PDF attachment"])assert.match(help,new RegExp(label));assert.doesNotMatch(help,/<a href="\/(?:capture|vault|settings)/)});

test("M4 keeps workspace context accessible, shareable, and timezone-safe",()=>{const capture=read("app/capture/page.tsx"),calendar=read("app/calendar/page.tsx"),vault=read("app/vault/page.tsx"),home=read("app/page.tsx"),compiler=read("app/coding/compiler/page.tsx");assert.match(capture,/tabIndex=\{0\}/);assert.match(capture,/aria-pressed=\{selected\}/);assert.match(capture,/params\.set\("q", searchQuery\)/);assert.match(calendar,/params\.set\("view",view\)/);assert.match(calendar,/event\.timezone/);assert.match(calendar,/dateTime=\{event\.startAt/);assert.match(vault,/params\.set\("folder",folder\)/);assert.match(home,/value=\{paletteQuery\}/);assert.doesNotMatch(home,/Asia\/Jakarta/);assert.match(compiler,/aria-live="polite"/)});
test("Calendar defers date-dependent rendering until hydration",()=>{const calendar=read("app/calendar/page.tsx");assert.match(calendar,/const \[hydrated,setHydrated\]=useState\(false\)/);assert.match(calendar,/if\(!hydrated\)return <ModuleShell active="Calendar" title="Calendar"><p role="status">Loading calendar…<\/p><\/ModuleShell>/)});
test("Capture row labels do not shadow the Capture details landmark",()=>{const capture=read("app/capture/page.tsx");assert.match(capture,/aria-label=\{`\$\{capture\.text\}\. \$\{statusMeta\[capture\.status\]\.label\}\. Open capture`\}/);assert.doesNotMatch(capture,/Open capture details/) });
test("root layout eagerly warms daily navigation routes",()=>{const layout=read("app/layout.tsx"),warmup=read("app/components/NavigationWarmup.tsx");assert.match(layout,/NavigationWarmup/);for(const route of ["capture","calendar","vault","settings"])assert.match(warmup,new RegExp(`/${route}`));assert.doesNotMatch(warmup,/requestIdleCallback/)});
test("root layout applies the saved Gruvbox theme before hydration",()=>{const layout=read("app/layout.tsx");assert.match(layout,/beforeInteractive/);assert.match(layout,/noema-theme/);assert.match(layout,/dataset\.theme/);assert.match(layout,/theme-color/);assert.match(layout,/<html lang="en" suppressHydrationWarning>/)});
test("global motion only transitions explicit visual properties",()=>{const css=read("app/globals.css");assert.doesNotMatch(css,/transition:\s*all/);assert.doesNotMatch(css,/transition:(?:max-width|max-height)/)});
test("route entries stay within the restrained M2 motion budget",()=>{const css=read("app/globals.css");for(const value of [/\.app-shell>main\{animation:noema-enter-rise \.18s var\(--ease\) both\}/,/\.module-main\{animation:noema-enter-rise \.18s var\(--ease\) both\}/,/html\[data-nav-dir="forward"\] \.module-main\{animation:noema-enter-forward \.18s var\(--ease\) both\}/,/html\[data-nav-dir="back"\] \.module-main\{animation:noema-enter-back \.18s var\(--ease\) both\}/])assert.match(css,value)});
test("app background uses a static tokenized paper grain",()=>{const css=read("app/globals.css");assert.match(css,/body\{[^}]*background-color:var\(--bg\)[^}]*background-image:radial-gradient\(color-mix\(in oklch,var\(--ink\) 8%,transparent\) \.5px,transparent \.5px\)[^}]*background-size:4px 4px/);assert.doesNotMatch(css,/paper-grain|grain.*animation/i)});
test("reading surfaces share the static tokenized paper grain",()=>{const css=read("app/globals.css");assert.match(css,/:where\(\.integrated-doc-page,\.source-page,\.flashcard\)\{background-image:radial-gradient\(color-mix\(in oklch,var\(--ink\) 8%,transparent\) \.5px,transparent \.5px\);background-size:4px 4px\}/)});
test("canvas save confirmation pulses briefly unless reduced motion is requested",()=>{const canvas=read("app/components/InfiniteCanvas.tsx"),css=read("app/globals.css");assert.match(canvas,/className=\{`canvas-save-status \$\{status==="Saved"\?"is-saved":""\}`\}/);assert.match(css,/\.canvas-save-status\.is-saved\{[^}]*animation:canvas-save-pulse \.6s var\(--ease\) both/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.canvas-save-status\.is-saved\{animation:none\}\}/)});
test("ink and capture canvases use semantic theme tokens",()=>{const css=read("app/globals.css");for(const value of [/\.white-infinite-canvas[^}]*background:var\(--bg\)/,/\.canvas-header[^}]*background:var\(--raised\)[^}]*border-bottom:1px solid var\(--border\)[^}]*color:var\(--ink\)/,/\.ink-workspace \{ background:var\(--paper\) !important; border:1px solid var\(--border\)[^}]*color:var\(--ink\)/,/\.ink-canvas\{[^}]*background:var\(--paper\)/,/\.ink-workspace \.ink-canvas \{ background:var\(--paper\) !important/])assert.match(css,value);assert.doesNotMatch(css,/background:oklch\(\.19 \.01 245\)/)});
test("terminal surfaces use semantic code and ink tokens",()=>{const css=read("app/globals.css");for(const value of [/\.repo-terminal pre,\.repo-git pre\{[^}]*background:var\(--code\)[^}]*color:var\(--ink\)/,/\.plugin-inspector pre\{[^}]*background:var\(--code\)[^}]*color:var\(--ink\)/])assert.match(css,value)});
test("compiler uses semantic code and syntax tokens",()=>{const css=read("app/globals.css"),start=css.lastIndexOf(".compiler-container{display:flex"),compiler=css.slice(start,css.indexOf(".markdown-preview",start));for(const value of ["--syntax-keyword","--syntax-string","--syntax-number","--syntax-comment","--syntax-builtin"])assert.match(compiler,new RegExp(value));assert.doesNotMatch(compiler,/#(?:080d0f|1c282b|f1f5f9|3dbb9e|ec4899|eab308|a855f7|6488b0|4ade80)/)});
test("code workspace status surfaces use semantic action and status tokens",()=>{const css=read("app/globals.css");for(const value of [/\.code-top \.seg button\.active\{background:var\(--primary-soft\)[^}]*color:var\(--primary\)/,/\.selection-ai-btn:hover\{background:var\(--surface\)/,/\.problem-item\.err\{background:color-mix\(in oklch,var\(--error\) 10%,transparent\)[^}]*border:1px solid color-mix\(in oklch,var\(--error\) 20%,transparent\)/,/\.problem-item\.clean\{background:color-mix\(in oklch,var\(--success\) 10%,transparent\)[^}]*color:var\(--success\)/])assert.match(css,value)});
test("status badge foregrounds use the semantic action ink token",()=>{const css=read("app/globals.css");for(const value of [/\.capture-filters button\.tab-review\.active \.tab-count\{background:var\(--warning\);color:var\(--primary-ink\)/,/\.integrated-floating-palette button\.active\{background:var\(--primary\);color:var\(--primary-ink\)/,/\.math-result-badge\{[^}]*background:var\(--success\);color:var\(--primary-ink\)/])assert.match(css,value)});
test("Vault drag feedback uses the semantic primary glow",()=>{const css=read("app/globals.css");assert.match(css,/\.vault-folder-card\.drag-over[^}]*box-shadow:0 0 12px color-mix\(in oklch,var\(--primary\) 25%,transparent\)/);assert.doesNotMatch(css,/rgba\(99,102,241,0\.25\)/)});
test("repo and action controls contain no teal color literals",()=>{const css=read("app/globals.css");for(const value of [/\.integrated-floating-palette button\.active\{background:var\(--primary\);color:var\(--primary-ink\)/,/\.terminal-view\{[^}]*background:var\(--code\)/,/\.diff del\{[^}]*background:color-mix\(in oklch,var\(--error\) 18%,var\(--code\)\)/,/\.diff ins\{[^}]*background:color-mix\(in oklch,var\(--success\) 18%,var\(--code\)\)/,/\.tutor-panel>form button\.primary\.icon-button\{[^}]*color:var\(--primary-ink\)/,/\.app-shell \.capture \.send\{color:var\(--primary-ink\)/])assert.match(css,value);assert.doesNotMatch(css,/oklch\([^)]*188\)/)});
test("shared keyboard focus uses the semantic focus token",()=>{const css=read("app/globals.css");assert.match(css,/--focus-ring:var\(--focus\)/);assert.match(css,/:focus-visible\{outline:2px solid var\(--focus-ring\)/)});
test("mobile viewport enables safe-area insets",()=>assert.match(read("app/layout.tsx"),/viewportFit:"cover"/));

test("mobile navigation exposes core navigation items",()=>{for(const file of ["app/components/ModuleShell.tsx","app/page.tsx"]){const page=read(file);assert.match(page,/\["Home"/);assert.match(page,/\["Vault"/);}});
test("tablet capture and navigation controls use a consistent icon system",()=>{const today=read("app/page.tsx"),shell=read("app/components/ModuleShell.tsx"),css=read("app/globals.css");assert.match(today,/name="quick-capture"/);assert.match(today,/autoComplete="off"/);assert.match(today,/\["Capture","\/capture",(Plus|Tray)\]/);assert.match(shell,/\["Capture","\/capture",(Plus|Tray)\]/);assert.match(css,/\.mobile-nav a svg\{width:22px;height:22px\}/);assert.doesNotMatch(`${today}${shell}${css}`,/capture-nav/);assert.match(css,/\.capture-tool\{display:grid/)});
test("composite search and capture fields use one visible focus boundary",()=>{const css=read("app/globals.css");assert.match(css,/\.capture input:focus-visible,.vault-organizer-search input:focus-visible\{outline:0\}/);assert.match(css,/\.vault-organizer-search:focus-within\{border-color:var\(--primary\)\}/)});
test("mobile Home shows every task in a fixed semantic order",()=>{const tasks=read("app/page.tsx"),css=read("app/globals.css");assert.match(tasks,/className="task-group-title overdue"[\s\S]*className="task-group-title today"[\s\S]*className="task-group-title upcoming"[\s\S]*className="task-group-title done"/);assert.match(tasks,/completedList\.map\(renderTask\)/);assert.match(tasks,/aria-expanded=\{!collapsedGroups\.has\("overdue"\)\}/);assert.match(tasks,/aria-expanded=\{!collapsedGroups\.has\("upcoming"\)\}/);assert.match(tasks,/aria-expanded=\{!collapsedGroups\.has\("done"\)\}/);assert.match(css,/\.home-task-toolbar\{display:none\}/);assert.match(css,/\.task-group-title\.overdue\{color:var\(--error\)\}/);assert.match(css,/\.task-group-title\.today\{color:var\(--primary\)\}/);assert.match(css,/\.task-group-title\.upcoming\{color:var\(--warning\)\}/);assert.match(css,/\.task-group-title\.done\{color:var\(--success\)\}/)});
test("mobile task due metadata sits beneath its Edit action",()=>{const css=read("app/globals.css");assert.match(css,/\.task-list article time\{grid-column:3;grid-row:2;justify-self:end;align-self:center;white-space:nowrap\}/)});
test("narrow task rows keep titles wide and the source/date on one baseline",()=>{const css=read("app/globals.css");assert.match(css,/@media\(max-width:420px\)\{\.task-list article\{position:relative\}\.task-list article time\{position:absolute;right:16px;bottom:16px;white-space:nowrap\}\}/)});

test("task editor replaces the list while creating or editing",()=>{const page=read("app/page.tsx"),css=read("app/globals.css");assert.match(page,/" editing"/);assert.match(css,/\.task-layout\.editing \.task-list\{display:none/)});
test("Vault note IDs work without crypto.randomUUID",()=>{const vault=read("app/vault/page.tsx"),ids=read("app/lib/id.ts");assert.match(vault,/createId\(\)/);assert.match(ids,/typeof crypto\.randomUUID===\"function\"/);assert.match(ids,/crypto\.getRandomValues/)});
test("browser code uses the HTTP-safe createId fallback",()=>{for(const file of files("app").filter(file=>/\.(?:ts|tsx)$/.test(file))){if(file!=="app/lib/id.ts")assert.doesNotMatch(read(file),/crypto\.randomUUID\(\)/,file)}});
test("Vault opens tree notes even before their summaries hydrate",()=>{const organizer=read("app/components/VaultOrganizer.tsx"),vault=read("app/vault/page.tsx");assert.match(organizer,/notes\.find\(note=>note\.id===id\)\|\|/);assert.match(vault,/Could not open note/);assert.doesNotMatch(vault,/catch\{\}/)});

test("global search exposes optional attributed semantic ranking",()=>{const shell=read("app/components/ModuleShell.tsx"),route=read("app/api/v1/search/route.ts"),search=read("server/search.mjs");assert.match(shell,/Semantic ranking/);assert.match(shell,/configured OpenAI embedding model/);assert.match(shell,/ranking\.source/);assert.match(route,/semantic:params\.get\("semantic"\)===\"true\"/);assert.match(search,/SQLite FTS\/LIKE/);assert.match(search,/selected\.add/);assert.match(search,/fallback:/) });
test("AI agent settings expose Groq",()=>assert.match(read("app/components/AIAgentSettings.tsx"),/"groq"/));

test("command palettes use a focus-trapping native modal",()=>{
  assert.match(read("app/components/ModalDialog.tsx"),/showModal\(\)/);
  for(const file of ["app/page.tsx","app/components/ModuleShell.tsx"])assert.match(read(file),/<ModalDialog/);
});
test("product actions use themed dialogs instead of browser prompts",()=>{
  const files=["app/automations/page.tsx","app/dashboards/page.tsx","app/plugins/page.tsx","app/coding/repositories/[id]/page.tsx","app/components/VaultOrganizer.tsx"];
  for(const file of files)assert.doesNotMatch(read(file),/\b(?:confirm|prompt)\s*\(/,file);
  assert.match(read("app/components/ActionDialog.tsx"),/showModal\(\)/);
});
test("action dialogs report empty input errors inline",()=>{const dialog=read("app/components/ActionDialog.tsx");assert.match(dialog,/form\.noValidate=true/);assert.match(dialog,/aria-invalid/);assert.match(dialog,/aria-describedby/);assert.match(dialog,/role","alert"/);assert.match(dialog,/Please enter /)});

test("PWA includes offline shell, share target, and raster icons",()=>{
  const manifest=JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.share_target.action,"/capture");
  assert.ok(manifest.icons.some(icon=>icon.sizes==="192x192"));
  assert.ok(manifest.icons.some(icon=>icon.sizes==="512x512"));
  const worker=read("public/sw.js");assert.match(worker,/caches\.open/);assert.match(worker,/SHELL=\[[^\]]*"\/tasks"[^\]]*\]/);
});
test("PWA only announces an actual waiting update",()=>{const pwa=read("app/components/PWARegister.tsx"),worker=read("public/sw.js");assert.match(pwa,/registration\.waiting&&navigator\.serviceWorker\.controller/);assert.match(pwa,/state===\"installed\"/);assert.match(pwa,/skip-waiting/);assert.match(worker,/event\.data\?\.type===\"skip-waiting\"/)});

test("reduced motion and responsive breakpoints remain enforced",()=>{
  const css=read("app/globals.css");
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\s*\.app-shell>main,\.module-main\{animation:none;opacity:1\}/);
  assert.match(css,/@media\(max-width:820px\)/);
  assert.match(css,/focus-visible/);
});

test("Capture inbox keeps its sticky toolbar opaque and omits recording",()=>{
  const capture=read("app/capture/page.tsx"),css=read("app/globals.css");
  assert.doesNotMatch(capture,/DurableRecorder|addVoiceCapture/);
  assert.match(css,/\.capture-queue-toolbar\{position:sticky;top:0;z-index:15;isolation:isolate;[^}]*background-color:var\(--bg\)/);
  assert.doesNotMatch(css,/\.capture-queue-toolbar\{[^}]*backdrop-filter/);
});


test("remote actions disclose missing AI and persistence",()=>{
  const notice=read("app/components/ServiceNotice.tsx");
  assert.match(notice,/role="alert"/);
  assert.match(notice,/AI and server persistence aren’t connected yet/);
  assert.doesNotMatch(read("app/login/page.tsx"),/secure sign-in link was sent/i);
  const today=read("app/page.tsx"),recorder=read("app/components/DurableRecorder.tsx");
  assert.match(today,/addAndInterpretCapture/);
  assert.match(today,/Interpretation ready/);
  assert.match(recorder,/navigator\.mediaDevices\.getUserMedia/);
  assert.match(recorder,/new MediaRecorder/);
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
  const shell=read("app/components/ModuleShell.tsx")+read("app/components/ContextualAssistant.tsx");assert.doesNotMatch(shell,/proposal review is the best next action/);assert.match(shell,/\/api\/v1\/recommendations/);assert.match(shell,/Create task/);assert.match(shell,/persisted drafts/);
});
test("contextual Plan submits a typed capture through the real collection route",()=>{const assistant=read("app/components/ContextualAssistant.tsx");assert.match(assistant,/fetch\("\/api\/v1\/captures"/);assert.match(assistant,/text: `Plan request: \$\{planPrompt\}`/);assert.match(assistant,/source: "typed"/) });

test("Vault renders accessible charts and Mermaid with source fallback",()=>{
  const content=read("app/components/MarkdownContent.tsx"),vault=read("app/vault/page.tsx");assert.match(content,/```\(mermaid\|chart\)/);assert.match(content,/role="img"/);assert.match(content,/<table>/);assert.match(content,/scope="row"/);assert.match(content,/Diagram could not be rendered/);assert.match(content,/View Mermaid source/);assert.match(vault,/MarkdownContent/);
});
test("note editors insert GFM tables and render LaTeX",()=>{const toolbar=read("app/components/MarkdownToolbar.tsx"),content=read("app/components/MarkdownContent.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),live=read("app/components/LiveMarkdownEditor.tsx"),vault=read("app/vault/page.tsx");assert.match(toolbar,/Insert table/);assert.match(toolbar,/Insert display equation/);assert.match(content,/remarkGfm/);assert.match(content,/remarkMath/);assert.match(content,/rehypeKatex/);assert.match(mixed,/LiveMarkdownEditor/);assert.match(live,/Crepe/);assert.match(live,/markdownUpdated/);assert.match(vault,/MarkdownToolbar/)});
test("note editors share deterministic mobile Markdown behavior",()=>{const behavior=read("app/lib/markdownEdit.ts");for(const token of ["pairs","Backspace","Tab","shiftKey","Enter","xX"] )assert.match(behavior,new RegExp(token));assert.match(read("app/vault/page.tsx"),/markdownKey/);assert.match(read("app/components/LiveMarkdownEditor.tsx"),/Crepe/)});
test("full and mixed note editors provide canonical wikilink completion",()=>{const completion=read("app/components/WikilinkCompletion.tsx"),mixed=read("app/components/MixedNoteEditor.tsx");assert.match(completion,/useAppState/);assert.match(completion,/\[\[/);assert.match(completion,/setRangeText/);assert.match(mixed,/MarkdownContent/);assert.match(read("app/vault/page.tsx"),/WikilinkCompletion/)});
test("note attachments use canonical assets and insert Markdown at the caret",()=>{const attachment=read("app/components/NoteAttachmentButton.tsx"),vault=read("app/vault/page.tsx");assert.match(attachment,/\/api\/v1\/assets/);assert.match(attachment,/setRangeText/);assert.match(attachment,/image\//);assert.match(vault,/NoteAttachmentButton/)});
test("Crepe image uploads resolve to durable asset URLs",()=>{const editor=read("app/components/LiveMarkdownEditor.tsx");assert.match(editor,/\[Crepe\.Feature\.ImageBlock\]/);assert.match(editor,/onUpload: uploadImage/);assert.match(editor,/`\/api\/v1\/assets\/\$\{asset\.id\}`/)});
test("notes default to preview while tutor and vault panes remain adjustable",()=>{const tutor=read("app/components/TutorPanel.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),vault=read("app/vault/page.tsx"),organizer=read("app/components/VaultOrganizer.tsx");assert.match(tutor,/MarkdownContent text=\{variant\?\.answer\?\?message\.text\}/);assert.match(tutor,/resizeWidth/);for(const mode of ["minimized","sheet","full"])assert.match(tutor,new RegExp(`"${mode}"`));assert.match(mixed,/viewMode/);assert.match(vault,/\("read"\)/);assert.match(organizer,/noema-vault-drawer/);assert.match(organizer,/aria-expanded=\{drawer\}/)});
test("Vault routes only synced vault entries to the mixed block editor",()=>{const ts=require("typescript"),compiled=ts.transpileModule(read("app/lib/noteKind.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,mod={exports:{}};new Function("exports","module",compiled)(mod.exports,mod);const {isVaultBackedNote}=mod.exports,vault=read("app/vault/page.tsx");assert.equal(isVaultBackedNote({sourceId:"source",relativePath:"folder/note.md"}),true);for(const note of [{id:"local",source:"Created in Noema"},{sourceId:"source",relativePath:null},{sourceId:null,relativePath:"note.md"},null])assert.equal(isVaultBackedNote(note),false);assert.match(vault,/const isVaultNote=isVaultBackedNote\(draft\)/);assert.match(vault,/if\(isVaultNote&&draft\)/)});
test("mobile knowledge workspaces keep primary actions and editing controls thumb-safe",()=>{const css=read("app/globals.css"),tutor=read("app/components/TutorPanel.tsx"),compiler=read("app/coding/compiler/page.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),organizer=read("app/components/VaultOrganizer.tsx");assert.match(css,/\.module-shell:has\(\.note-workspace\) \.top-primary\{position:fixed/);assert.match(css,/\.top-primary\{bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\)/);assert.match(css,/integrated-doc-container\{padding-bottom:88px!important/);assert.match(css,/\.markdown-toolbar button[^}]*min-width:44px/);assert.match(css,/\.code-editor textarea\.code-body[^}]*font-size:16px!important/);assert.match(tutor,/returnFocus/);assert.match(tutor,/aria-modal="false"/);assert.match(compiler,/Create first file/);assert.match(compiler,/aria-modal="false"/);assert.match(mixed,/aria-modal="false"/);assert.match(mixed,/closePenOptions/);assert.match(organizer,/initialLoading/);assert.match(organizer,/Create note/)});
test("Vault exposes a full-width mobile New note action above navigation",()=>{const organizer=read("app/components/VaultOrganizer.tsx"),css=read("app/globals.css");assert.match(organizer,/className="vault-mobile-action"/);assert.match(organizer,/<span>New note<\/span>/);assert.match(css,/\.vault-mobile-action\{position:fixed[^}]*bottom:calc\(80px \+ env\(safe-area-inset-bottom\)\)/);assert.match(css,/\.vault-mobile-action \.primary\{[^}]*width:100%[^}]*min-height:48px/)});
test("Obsidian sync is stable and read-only",()=>{const sync=read("scripts/sync-obsidian.mjs");assert.match(sync,/createHash/);assert.match(sync,/Obsidian ·/);assert.match(sync,/readFileSync/);assert.doesNotMatch(sync,/writeFile|unlink|rename|rmSync/)});
test("vault tasks expose live counts, source links, device-zone scheduling, and discriminated calendar items",()=>{const tasks=read("app/page.tsx"),calendar=read("app/calendar/page.tsx"),state=read("app/components/AppState.tsx");assert.doesNotMatch(tasks,/Four tasks are ready/);assert.match(tasks,/counts=Object\.fromEntries/);assert.doesNotMatch(tasks,/Asia\/Jakarta/);assert.match(tasks,/vaultSource\.relativePath/);assert.match(tasks,/Open source note/);assert.match(state,/kind:"event"/);assert.match(state,/kind:"task"/);assert.match(calendar,/calendarItems\s*\.map\(item => \(item\.kind === "task"/)});
test("mixed handwriting editor preserves offline strokes and pen-first input",()=>{const editor=read("app/components/InkEditor.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),ink=read("app/lib/ink.ts"),queue=read("app/lib/offlineQueue.ts"),worker=read("server/worker/handlers/handwriting-ocr.mjs");assert.match(editor,/getCoalescedEvents/);assert.match(editor,/pointerType==="pen"/);assert.match(editor,/saveInkDraft/);for(const tool of ["pen","highlighter","eraser","lasso"])assert.match(editor,new RegExp(`"${tool}"`));assert.match(mixed,/blocks/);assert.match(queue,/ink-drafts/);assert.match(ink,/pressure:event\.pressure>0/);assert.match(worker,/strokesToPng/);assert.match(worker,/mimeType:"image\/png"/);assert.doesNotMatch(worker,/mimeType:"image\/svg\+xml"/)});
test("inline ink creation is retired while legacy ink blocks remain readable",()=>{const mixed=read("app/components/MixedNoteEditor.tsx"),memory=read("PROJECT.md");assert.doesNotMatch(mixed,/Insert ink|insertInk|block-actions/);assert.match(mixed,/InkBlockView/);assert.match(memory,/Inline `Insert ink` block creation is discontinued legacy/)});
test("mixed note editor renders every ink block in flow with move/delete handles",()=>{const mixed=read("app/components/MixedNoteEditor.tsx");assert.match(mixed,/InkBlockView/);assert.match(mixed,/Move ink block up/);assert.match(mixed,/Move ink block down/);assert.match(mixed,/Delete ink block/);assert.match(mixed,/blocks\.map\(\(block\) =>/)});
test("ink surfaces share the viewport gesture helpers instead of inline math",()=>{const ink=read("app/lib/ink.ts"),editor=read("app/components/InkEditor.tsx"),mixed=read("app/components/MixedNoteEditor.tsx");assert.match(ink,/export function applyPinch|function applyPinch/);assert.match(ink,/export function zoomAtPoint|function zoomAtPoint/);assert.match(editor,/applyPinch|zoomAtPoint|panBy/);assert.match(mixed,/pinchViewport/);assert.match(mixed,/zoomAtScreenPoint/);assert.doesNotMatch(editor,/pinchAnchor/)});

test("handwritten math continuation proposes reviewable blocks without touching strokes",()=>{
  const handler=read("server/worker/handlers/continue-math.mjs"),dispatch=read("server/worker/dispatch.mjs"),math=read("server/math.mjs"),route=read("app/api/v1/notes/[id]/continue-math/route.ts"),mixed=read("app/components/MixedNoteEditor.tsx");
  assert.match(dispatch,/"continue-math":handleContinueMath/);
  for(const token of ["analysis","continuation","confidence","assumptions"])assert.match(handler,new RegExp(token));
  assert.match(handler,/strokesToPng/);assert.match(handler,/math_continuations/);
  assert.match(math,/requestMathContinuation/);assert.match(math,/resolveMathContinuation/);
  assert.match(route,/insertMarkdownBlockAfter/);
  assert.match(mixed,/Continue math/);assert.match(mixed,/MathContinuationCard/);assert.match(mixed,/Insert as block/);
});
test("image captures are read visually with structured equations and tables",()=>{
  const extract=read("server/extract.mjs"),interpreter=read("server/worker/handlers/interpret-capture.mjs");
  assert.match(extract,/extractStructuredImage/);assert.match(extract,/tables:\{type:"array"/);assert.match(extract,/structuredImageToMarkdown/);
  assert.match(interpreter,/extractStructuredImage/);assert.match(interpreter,/structuredImageToMarkdown/);
});
test("camera quick action batches multiple photos into one interpreted capture",()=>{
  const home=read("app/page.tsx"),state=read("app/components/AppState.tsx");
  assert.match(home,/capture="environment"/);assert.match(home,/multiple/);assert.match(home,/addFileCaptures/);
  assert.match(state,/addFileCaptures:\(files/);
});
test("captures can skip AI and stay raw with a device default",()=>{
  const home=read("app/page.tsx"),settingsPage=read("app/settings/page.tsx");
  assert.match(home,/noema-auto-interpret/);assert.match(home,/autoInterpret\?addAndInterpretCapture\(text\):addCapture\(text\)/);
  assert.match(settingsPage,/Interpret captures with AI/);
});
test("inbox surfaces pending handwriting processing",()=>{
  const page=read("app/capture/page.tsx");assert.match(page,/process-pending/);assert.match(page,/Process inbox/);
});
test("lecture recordings transcribe through a chunked provider chain",()=>{
  const service=read("server/transcribe.mjs"),handler=read("server/worker/handlers/transcribe-audio.mjs"),dispatch=read("server/worker/dispatch.mjs"),route=read("app/api/v1/captures/[id]/transcribe/route.ts"),page=read("app/capture/page.tsx");
  for(const token of ["chunkAudio","transcribeViaGroq","audio/transcriptions","transcribeViaGemini","whisperBin","NOEMA_AUDIO_CHUNK_SECONDS","requestTranscription","finishTranscription"])assert.match(service,new RegExp(token));
  assert.match(dispatch,/"transcribe-audio":handleTranscribeAudio/);
  assert.match(handler,/transcribeAudioFile/);assert.match(handler,/state='failed'/);
  assert.match(route,/requestTranscription/);assert.match(route,/transcriptForCapture/);
});
test("voice captures are honestly tagged and transcribe into synced study notes",()=>{
  const state=read("app/components/AppState.tsx"),page=read("app/capture/page.tsx");
  assert.match(state,/addVoiceCapture:\(file/);assert.match(state,/source:"voice" as const/);assert.match(state,/Voice recording · /);
  for(const token of ["TranscriptPanel","transcript-segment","Summarize into study note","mode: \"study\""])assert.match(page,new RegExp(token));
});
test("mixed notes debounce serialized block saves and protect dirty drafts",()=>{const mixed=read("app/components/MixedNoteEditor.tsx"),live=read("app/components/LiveMarkdownEditor.tsx"),vault=read("app/vault/page.tsx");assert.match(mixed,/setTimeout\(\(\) => void flushMarkdown\(block\.id\), 800\)/);assert.match(mixed,/saveChains\.current/);assert.match(mixed,/onDirtyChange/);assert.match(live,/replaceAll/);assert.match(vault,/beforeunload/)});
test("ink exposes world-edit transforms and geometric tool types",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const tool of ["rectangle","ellipse","arrow","rotateStroke","scaleStroke","formatVersion:2","coordinateSpace:\"world\"","Ruler snap"])assert.match(`${editor}\n${ink}`,new RegExp(tool))});
test("ink replay drops malformed strokes before rendering or transforms",()=>{const ink=read("app/lib/ink.ts"),editor=read("app/components/InkEditor.tsx");assert.match(ink,/sanitizeStrokes/);assert.match(ink,/if\(!a\|\|!b\)return ""/);assert.match(editor,/sanitizeStrokes\(initial\)/);assert.match(editor,/sanitizeStrokes\(draft\?\.strokes\)/)});
test("ink touch gestures pan, pinch, and support two-finger double-tap undo",()=>{const editor=read("app/components/InkEditor.tsx");for(const token of ["touches","pinchDistance","lastTwoTap","pointerType===\"touch\"","viewBox","undo\(\)"])assert.match(editor,new RegExp(token))});
test("ink touch navigation preserves a manual view and pinches around its midpoint",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const token of ["userInteracted.current = true","previousCenter"])assert.match(editor,new RegExp(token));assert.match(editor,/applyPinch\(/);assert.match(ink,/function applyPinch/)});
test("shared ink viewport helpers are tested pure functions adopted by every ink surface",()=>{
  const ts=require("typescript");
  const compiled=ts.transpileModule(read("app/lib/ink.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:"es2019"}}).outputText;
  const module={exports:{}};
  new Function("exports","module","performance",compiled)(module.exports,module,{now:()=>0});
  const {applyPinch,zoomAtPoint,panBy,clampZoom,penRecentlyUp}=module.exports;
  const rect={left:0,top:0,width:100,height:100};
  const view={x:0,y:0,zoom:1};
  assert.deepEqual(panBy(view,10,20),{x:-10,y:-20,zoom:1});
  assert.equal(clampZoom(.1),.25);
  assert.equal(clampZoom(9),9);
  const pinched=applyPinch(view,rect,200,200,{x:50,y:50},{x:60,y:60},2);
  assert.equal(pinched.zoom,2);
  assert.ok(Math.abs(pinched.x-40)<1e-9&&Math.abs(pinched.y-40)<1e-9);
  const pinchedOut=applyPinch(view,rect,200,200,{x:50,y:50},{x:50,y:50},0);
  assert.equal(pinchedOut.zoom,.25);
  assert.ok(Math.abs(pinchedOut.x+300)<1e-9&&Math.abs(pinchedOut.y+300)<1e-9);
  const zoomed=zoomAtPoint(view,rect,200,200,50,50,2);
  assert.equal(zoomed.zoom,2);
  assert.ok(Math.abs(zoomed.x-50)<1e-9&&Math.abs(zoomed.y-50)<1e-9);
  assert.equal(zoomAtPoint(view,rect,200,200,50,50,.001).zoom,.25);
  assert.equal(clampZoom(100),16);
  assert.equal(penRecentlyUp("touch",false,0,100),true);
  assert.equal(penRecentlyUp("touch",false,0,400),false);
  assert.equal(penRecentlyUp("pen",false,0,0),false);
});
test("viewport transforms preserve focal document points without drift",()=>{
  const ts=require("typescript");
  const compiled=ts.transpileModule(read("app/lib/ink.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:"es2019"}}).outputText;
  const module={exports:{}};
  new Function("exports","module","performance",compiled)(module.exports,module,{now:()=>0});
  const {screenToCanvas,canvasToScreen,zoomAtScreenPoint,pinchViewport}=module.exports;
  const viewport={x:10,y:-20,zoom:2};
  assert.deepEqual(screenToCanvas({x:110,y:80},viewport),{x:50,y:50});
  assert.deepEqual(canvasToScreen({x:50,y:50},viewport),{x:110,y:80});
  const focal={x:200,y:150};
  const anchored=zoomAtScreenPoint({x:-100,y:-50,zoom:1},focal,4);
  assert.deepEqual(anchored,{x:-1000,y:-650,zoom:4});
  assert.deepEqual(canvasToScreen(screenToCanvas(focal,{x:-100,y:-50,zoom:1}),anchored),focal);
  let cycled={x:-120,y:-80,zoom:1};
  for(let index=0;index<10;index++){
    cycled=zoomAtScreenPoint(cycled,focal,5);
    cycled=zoomAtScreenPoint(cycled,focal,1);
  }
  assert.ok(Math.abs(cycled.x+120)<1e-9&&Math.abs(cycled.y+80)<1e-9&&cycled.zoom===1);
  assert.deepEqual(pinchViewport({x:0,y:0,zoom:16},{x:50,y:50},{x:70,y:80},32),{x:20,y:30,zoom:16});
});
test("ink save retries an expected-version conflict with the authoritative block version",async()=>{
  const ts=require("typescript");
  const compiled=ts.transpileModule(read("app/lib/ink.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:"es2019"}}).outputText;
  const module={exports:{}};
  new Function("exports","module","performance",compiled)(module.exports,module,{now:()=>0});
  const calls=[];
  const responses=[
    {ok:false,status:409,json:async()=>({error:{message:"Expected version 3"}})},
    {ok:true,status:200,json:async()=>({blocks:[{id:"ink-1",inkVersion:3}]})},
    {ok:true,status:201,json:async()=>({id:"ink-1",version:4})}
  ];
  const request=async(url,options)=>{calls.push({url,body:options?.body&&JSON.parse(options.body)});return responses.shift()};
  const saved=await module.exports.saveInkWithRetry("note-1",{id:"ink-1",version:2,width:320,height:240,strokes:[]},request,()=>"key");
  assert.equal(saved.version,4);
  assert.deepEqual(calls.filter(call=>call.body).map(call=>call.body.version),[2,3]);
});
test("Vault ink keeps vector geometry and document-relative stroke width through zoom",()=>{const ink=read("app/lib/ink.ts"),mixed=read("app/components/MixedNoteEditor.tsx"),vault=read("server/vault.mjs");assert.match(ink,/ZOOM_MAX=16/);assert.match(ink,/Q\$\{/);assert.match(mixed,/width:\s*size[,\n]/);assert.match(mixed,/eraseAt\([^\n]+size\s*\*\s*4\)/);assert.doesNotMatch(mixed,/width:\s*size\s*\//);assert.doesNotMatch(mixed,/eraseAt\([^\n]+\/\s*\(zoomRef/);assert.match(mixed,/svgClientToPoint/);assert.match(vault,/smoothStrokePath/);assert.doesNotMatch(vault,/\.png\]\]/)});
test("ink auto-fit avoids opening a small drawing at maximum zoom",()=>assert.match(read("app/lib/ink.ts"),/Math\.min\(2,/));
test("Vault uses an Obsidian-style tree with breadcrumbs and visible ink entry points",()=>{const page=read("app/vault/page.tsx"),organizer=read("app/components/VaultOrganizer.tsx");assert.match(page,/VaultOrganizer/);assert.match(organizer,/Vault folders/);assert.match(organizer,/Breadcrumb/);assert.match(organizer,/Draw in/);assert.match(organizer,/entries\/move/);assert.match(organizer,/entries\/trash/);assert.match(organizer,/New note/)});
test("Vault initial connection uses one snapshot request without a client waterfall",()=>{const organizer=read("app/components/VaultOrganizer.tsx"),route=read("app/api/v1/vault-sources/route.ts");assert.match(organizer,/tree=true/);assert.doesNotMatch(organizer,/vault-sources\/\$\{id\}\/tree/);assert.match(route,/vaultTree/);assert.match(route,/selectedSourceId/)});
test("Vault opens Tutor without a deferred component load",()=>{const vault=read("app/vault/page.tsx");assert.match(vault,/dynamic\(\(\)=>import\("\.\.\/components\/MarkdownContent"\)/);assert.match(vault,/dynamic\(\(\)=>import\("\.\.\/components\/MixedNoteEditor"\)/);assert.match(vault,/import \{TutorPanel\} from "\.\.\/components\/TutorPanel"/);assert.doesNotMatch(vault,/dynamic\(\(\)=>import\("\.\.\/components\/TutorPanel"\)/)});
test("vault root heading does not repeat the selected source breadcrumb",()=>{assert.match(read("app/globals.css"),/vault-breadcrumbs:not\(:has\(span\)\)\{display:none\}/)});
test("Vault note titles align with folder titles",()=>{assert.match(read("app/globals.css"),/\.vault-file-card>button:first-child\{[^}]*justify-items:start[^}]*text-align:left/)});
test("Vault organizer stays bounded and search-led on tablet",()=>{const css=read("app/globals.css");assert.match(css,/\.obsidian-vault\{position:relative/);assert.match(css,/\.obsidian-vault>header\{display:grid;grid-template-columns:auto minmax\(0,1fr\) auto/);assert.match(css,/\.vault-organizer-search\{grid-column:1\/-1/)});
test("Vault folder drawer restores its last saved state",()=>{const organizer=read("app/components/VaultOrganizer.tsx");assert.match(organizer,/setDrawer\(localStorage\.getItem\("noema-vault-drawer"\)===\"open"\)/);assert.doesNotMatch(organizer,/matchMedia\(/)});
test("Vault starts with folders collapsed and discloses their notes",()=>{const organizer=read("app/components/VaultOrganizer.tsx");assert.match(organizer,/localStorage\.getItem\("noema-vault-drawer"\)==="open"/);assert.match(organizer,/const \[open,setOpen\]=useState\(false\)/);assert.match(organizer,/node\.notes\.map\(note/);assert.match(organizer,/aria-label=\{`\$\{open\?"Collapse":"Expand"\} \$\{node\.name\}`\}/)});
test("Vault scrollbar uses subdued semantic theme colors",()=>{const css=read("app/globals.css");assert.match(css,/\.obsidian-tree,\.obsidian-vault-body>main\{[^}]*scrollbar-color:color-mix\(in oklch,var\(--muted\) 68%,var\(--sidebar\)\)/);assert.match(css,/\.obsidian-vault-body>main::-webkit-scrollbar-button\{display:none\}/);assert.match(css,/\.obsidian-vault-body>main::-webkit-scrollbar-thumb\{[^}]*background:color-mix\(in oklch,var\(--muted\) 68%,var\(--sidebar\)\)/);assert.match(css,/\.obsidian-vault-body>main::-webkit-scrollbar-thumb:hover\{[^}]*background:var\(--muted\)/)});
test("Rich note editing uses Noema theme tokens",()=>{const css=read("app/globals.css");for(const token of ["--crepe-color-background:var(--surface)!important","--crepe-color-on-background:var(--ink)!important","--crepe-color-primary:var(--primary)!important","--crepe-color-surface-low:var(--raised)!important"])assert.match(css,new RegExp(token.replace(/[()]/g,"\\$&")))});
test("Rich note editing is a single layered reading surface",()=>{const css=read("app/globals.css");for(const token of ["--crepe-base-font-size:14px!important","background:transparent!important;border:0!important","z-index:100!important",".ProseMirror h2{font-size:1.25rem!important",".integrated-doc-container:has(.live-markdown-editor) .integrated-doc-page{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important",".live-markdown-editor .ProseMirror{padding-inline:clamp(20px,3vw,48px)!important"])assert.match(css,new RegExp(token.replace(/[()]/g,"\\$&")))});
test("PDF annotation workspace renders lazy pages and normalized accessible overlays",()=>{const page=read("app/assets/[id]/annotate/page.tsx"),capture=read("app/capture/page.tsx");assert.match(page,/pdfjs-dist/);assert.match(page,/getDocument/);assert.match(page,/geometry/);assert.match(page,/setPointerCapture/);assert.match(page,/aria-label="PDF annotation tools"/);assert.match(page,/Export annotations/);assert.match(page,/link_type/);assert.match(capture,/asset\.mime==="application\/pdf"/);assert.match(capture,/\/assets\/\$\{asset\.id\}\/annotate/)});
test("annotator supports eraser, colors, edit/delete, and page-count guard",()=>{const page=read("app/assets/[id]/annotate/page.tsx"),style=read("app/lib/pdfAnnotationStyle.ts");for(const token of ["Eraser","pdf-color-picker","COLOR_PALETTE","annotation-edit-form","is beyond this document"])assert.match(page,new RegExp(token));assert.match(style,/COLOR_PALETTE=/)});
test("export fidelity shares annotation style constants with the preview",()=>{
  const server=read("server/pdf-style.mjs");const values=server.match(/export const (DEFAULT_COLOR|HIGHLIGHT_OPACITY|INK_THICKNESS|TEXT_MIN_SIZE|TEXT_MAX_SIZE)="?([^"\n;]+)"?;/g);
  assert.ok(values&&values.length===5,"all constants present in server module");
  for(const line of values){const name=line.match(/const (\w+)/)[1],value=line.split("=").pop().replace(/;$/,"");assert.ok(read("app/lib/pdfAnnotationStyle.ts").includes(`${name}=${value}`),`${name}=${value}`)}
  const exporter=read("server/pdf-export.mjs");for(const token of ["drawComment","smoothInk","HIGHLIGHT_OPACITY","INK_THICKNESS"])assert.match(exporter,new RegExp(token));
});
test("DOCX uploads convert to annotatable PDFs behind an env-flagged service",()=>{
  assert.ok(fs.existsSync(path.join(root,"server/docx.mjs")));
  const docx=read("server/docx.mjs"),route=read("app/api/v1/assets/route.ts");
  assert.match(docx,/soffice/);assert.match(docx,/NOEMA_DOCX_CONVERSION/);assert.match(docx,/return null/);
  assert.match(route,/convertDocxToPdf/);assert.match(route,/derivedFrom/);
});
test("workspace export includes ink blocks and PDF annotations",()=>{const ops=read("server/ops.mjs");for(const table of ["note_blocks","note_ink_blocks","pdf_annotations"])assert.match(ops,new RegExp(`"${table}"`))});
test("annotation sidecars re-import through a dedicated endpoint",()=>{
  assert.ok(fs.existsSync(path.join(root,"app/api/v1/assets/[id]/annotations/import/route.ts")));
  const annotations=read("server/annotations.mjs");assert.match(annotations,/importAnnotationsSidecar/);assert.match(annotations,/noema-pdf-annotations/);
});
test("uploads are validated by magic bytes with friendly 415 guidance",()=>{const objects=read("server/objects.mjs");assert.match(objects,/function sniffMime/);assert.match(objects,/%PDF/);assert.match(objects,/Unsupported file type\. Accepted:/)});
test("note PDF export renders rich markdown with a CJK-safe font path",()=>{const exporter=read("server/note-pdf.mjs");for(const token of ["fontkit","embedCjk","NOEMA_CJK_FONT","CODE_BG",'"bold"',"```","drawTable|cells\\(raw\\)"])assert.match(exporter,new RegExp(token))});
test("PDF export flattens normalized annotations without mutating the source",()=>{const exporter=read("server/pdf-export.mjs"),route=read("app/api/v1/assets/[id]/annotations/export/route.ts");assert.match(exporter,/PDFDocument\.load/);assert.match(exporter,/drawRectangle/);assert.match(exporter,/drawLine/);assert.match(exporter,/drawText/);assert.match(exporter,/listAnnotations/);assert.match(route,/application\/pdf/);assert.match(route,/requireWorkspace/)});
test("notes retain Markdown while offering paginated presentation PDF export",()=>{const exporter=read("server/note-pdf.mjs"),route=read("app/api/v1/notes/[id]/export/route.ts"),vault=read("app/vault/page.tsx");assert.match(exporter,/exportMarkdown/);assert.match(exporter,/PDFDocument\.create/);assert.match(exporter,/addPage/);assert.match(exporter,/Exported from Noema/);assert.match(route,/get\("format"\)===\"pdf\"/);assert.match(route,/application\/pdf/);assert.match(vault,/exportPdf/);assert.match(vault,/>Markdown</);assert.match(vault,/>PDF</)});
test("job streams resume by event ID and emit heartbeats",()=>{const stream=read("app/api/v1/jobs/[id]/events/route.ts"),retry=read("app/api/v1/jobs/[id]/retry/route.ts");assert.match(stream,/last-event-id/);assert.match(stream,/id: \$\{id\}/);assert.match(stream,/: heartbeat/);assert.match(retry,/retryJob/)});
test("notification deliveries expose durable status and retry controls",()=>{const route=read("app/api/v1/notification-deliveries/[id]/route.ts"),push=read("server/push.mjs");assert.match(route,/retryDelivery/);assert.match(route,/resolveDelivery/);assert.match(push,/permanent-failure/);assert.match(push,/status===404\|\|status===410/)});
test("Settings enrolls and removes browser Web Push",()=>{const settings=read("app/settings/page.tsx"),route=read("app/api/v1/push-subscriptions/route.ts"),worker=read("public/sw.js");assert.match(settings,/Notification\.requestPermission/);assert.match(settings,/pushManager\.subscribe/);assert.match(settings,/current\.unsubscribe/);assert.match(route,/vapidPublicKey/);assert.match(route,/deletePushSubscription/);assert.match(worker,/addEventListener\("push"/);assert.match(worker,/showNotification/);assert.match(worker,/notificationclick/) });
test("automations and notifications reconnect to durable live snapshots",()=>{const automation=read("app/automations/page.tsx"),notifications=read("app/notifications/page.tsx"),runRoute=read("app/api/v1/automations/[id]/runs/[runId]/route.ts");for(const route of ["app/api/v1/automations/[id]/events/route.ts","app/api/v1/notifications/events/route.ts"]){const stream=read(route);assert.match(stream,/text\/event-stream/);assert.match(stream,/retry: 3000/);assert.match(stream,/: heartbeat/);assert.match(stream,/event: snapshot/)}assert.match(automation,/new EventSource/);assert.match(automation,/runAction/);assert.match(notifications,/new EventSource/);assert.match(runRoute,/cancelAutomationRun/);assert.match(runRoute,/retryAutomationRun/)});
test("notification center filters, groups, marks read, and navigates to related objects",()=>{const page=read("app/notifications/page.tsx");assert.match(page,/read-all/);assert.match(page,/deliveryAction/);assert.match(page,/related_type/);assert.match(page,/No notifications match this filter/)});
test("Home and module shells use real notifications while OCR failures expose retry",()=>{const home=read("app/page.tsx"),shell=read("app/components/ModuleShell.tsx"),button=read("app/components/NotificationButton.tsx"),editor=read("app/components/MixedNoteEditor.tsx");assert.match(home,/<NotificationButton\/>/);assert.match(shell,/<NotificationButton\/>/);assert.match(button,/\/api\/v1\/notifications/);assert.match(button,/View all notifications/);assert.doesNotMatch(home,/data-unavailable=.*notifications/);assert.match(editor,/Handwriting recognition/);assert.match(editor,/\/ocr/);assert.match(editor,/Retry recognition/)});

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
test("typed captures enter the durable queue before network interpretation",()=>{const state=read("app/components/AppState.tsx"),queue=read("app/lib/offlineQueue.ts");assert.match(state,/queueRequest\(\{path:"\/captures",method:"POST",body:capture,idempotencyKey/);assert.match(state,/\.then\(\(\)=>flushQueue\(\)\)/);assert.match(queue,/noema:capture-synced/);assert.match(state,/watchInterpretation\(capture,result\.jobId\)/)});
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
test("login offers owner-only Google sign-in",()=>{const page=read("app/login/page.tsx"),start=read("app/api/v1/auth/google/route.ts"),callback=read("app/api/v1/auth/google/callback/route.ts");assert.match(page,/Continue with Google/);assert.match(start,/beginGoogleSignIn/);assert.match(start,/ensureDefaultWorkspace\(owner\.id\)/);assert.match(callback,/completeGoogleSignIn/);assert.match(callback,/new URL\(config\.googleLoginRedirectUri\)\.origin/);assert.match(callback,/NOEMA_OWNER_EMAIL/)});

test("login and Settings expose recovery and MFA revocation controls",()=>{
  const login=read("app/login/page.tsx"),settings=read("app/settings/page.tsx");assert.match(login,/recoveryCode/);assert.match(login,/Use a recovery code/);assert.match(settings,/\/api\/v1\/auth\/recovery/);assert.match(settings,/method:"DELETE"/);assert.match(settings,/invalidates every recovery code/);
});

test("Settings workspace export downloads a streamed archive",()=>{
  const settings=read("app/settings/page.tsx");assert.match(settings,/location\.assign\("\/api\/v1\/export"\)/);
  const route=read("app/api/v1/export/route.ts");assert.match(route,/requireMfa/);assert.match(route,/application\/x-tar/);assert.match(route,/workspace\.json/);assert.match(route,/assets\//);
});

test("Settings loads and saves persisted account controls",()=>{
  const page=read("app/settings/page.tsx");assert.match(page,/\/api\/v1\/settings/);assert.match(page,/\/api\/v1\/settings\/password/);assert.match(page,/\/api\/v1\/auth\/sessions/);assert.match(page,/\/api\/v1\/auth\/totp/);assert.match(page,/Idempotency-Key/);
});

test("Settings connects Google and selects discovered calendars",()=>{const page=read("app/settings/page.tsx"),callback=read("app/api/v1/integrations/google/callback/route.ts");assert.match(page,/\/api\/v1\/integrations\/google\/connect/);assert.match(page,/Refresh calendars/);assert.match(page,/calendarIds/);assert.match(page,/Disconnect/);assert.match(callback,/completeGoogleOAuth/);assert.match(callback,/new URL\(config\.googleRedirectUri\)\.origin/) });
test("Settings controls preserve usable widths",()=>{const css=read("app/globals.css");assert.match(css,/\.settings-content \.setting-row select.*min-width:200px/);assert.match(css,/\.settings-content \.profile-block>input.*flex:0 1 360px/);assert.match(css,/\.settings-content \.setting-row>input:not\(\[type=checkbox\]\).*flex:1 1 160px/) });
test("module pages keep their main content scrollable",()=>assert.match(read("app/globals.css"),/\.module-main\{min-height:0;overflow-y:auto\}/));
test("Settings selects the handwriting capture vault",()=>{const page=read("app/settings/page.tsx"),settings=read("server/settings.mjs");assert.match(page,/aria-label="Capture vault"/);assert.match(page,/captureVaultSourceId/);assert.match(settings,/captureVaultSourceId/)});
test("Settings explains when Google Calendar OAuth lacks server credentials",()=>{const settings=read("app/settings/page.tsx"),route=read("app/api/v1/integrations/google/route.ts");assert.match(route,/configured/);assert.match(settings,/Google OAuth credentials are not configured/);assert.match(settings,/google\.configured/)});

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

test("knowledge graph exposes accessible visual, table, paths, and provenance",()=>{const page=read("app/components/KnowledgeGraphView.tsx"),shell=read("app/components/ModuleShell.tsx");assert.match(page,/\/api\/v1\/knowledge-graph/);assert.match(page,/role="img"/);assert.match(page,/Accessible relationship table/);assert.match(page,/Trace a path/);assert.match(page,/provenance/);assert.match(page,/Open source/);assert.match(shell,/\["Vault","\/vault"/)});
test("tasks and events expose durable reminder controls",()=>{
  for(const file of ["app/page.tsx","app/calendar/page.tsx"])assert.match(read(file),/type="datetime-local"/);
  assert.match(read("server/worker/maintenance/reminders.mjs"),/deliverDueReminders/);
});

test("Calendar edits normalized event time and recurrence",()=>{const page=read("app/calendar/page.tsx"),route=read("app/api/v1/events/[id]/route.ts");assert.match(page,/startAt:start\.toISOString/);assert.match(page,/resolvedOptions\(\)\.timeZone/);assert.match(page,/All day/);assert.match(page,/frequency/);assert.doesNotMatch(page,/July 2026/);assert.match(route,/deleteEvent/) });
test("Calendar drills into a double-clicked date and moves Day view one day at a time",()=>{const page=read("app/calendar/page.tsx");for(const token of ["onDoubleClick","setView\\(\"Day\"\\)","function movePeriod","selectedEvents.map","selectedTasks.map"])assert.match(page,new RegExp(token))});
test("Calendar Day view shows the full day in its own scroll area",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(page,/Array\.from\(\{length:25\}/);assert.match(page,/dayPositionFor/);assert.match(css,/\.day-view\{height:min\(70dvh,680px\);min-height:0;overflow:auto/);assert.match(css,/\.day-view>\.times,\.day-view>div:last-child\{min-height:1456px/);assert.match(css,/\.times time:first-child\{transform:none\}/)});
test("Calendar Week view scrolls its all-day row with the timeline and separates timed events and tasks",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");for(const token of ["week-scroll","week-all-day","allDayEvents","allDayTasks","timedEvents","timedTaskItems","formatTimeRange"])assert.match(page,new RegExp(token));assert.match(css,/\.week-scroll\{height:min\(76dvh,820px\);overflow:auto/);assert.match(css,/\.week-day-column/)});
test("Calendar only opens selected-date details when that date has items",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(page,/const hasSelectedItems = selectedTasks\.length \+ selectedEvents\.length > 0/);assert.match(page,/\) : hasSelectedItems \? \(/);assert.match(page,/calendar-popover/);assert.match(css,/\.calendar-layout\{position:relative;display:block/);assert.match(css,/\.calendar-popover\{position:absolute/)});
test("Calendar timelines reserve their scrollbar and contain scroll gestures",()=>{const css=read("app/globals.css");assert.match(css,/scrollbar-gutter:stable/);assert.match(css,/overscroll-behavior:contain/)});
test("Week columns remain readable and can scroll horizontally",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(page,/dates\.map\(\(date,index\)=>/);assert.match(css,/\.week-scroll\{height:min\(76dvh,820px\);overflow:auto/);assert.match(css,/repeat\(7,minmax\(150px,1fr\)\)/)});
test("Month cells keep equal widths and show event names without times",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(css,/\.month-scroll>\.month-view\{grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);assert.match(css,/\.month-view>strong,\.month-view>button\{min-width:0;overflow:hidden/);assert.match(css,/\.month-scroll\{height:min\(62dvh,520px\);overflow:auto/);assert.doesNotMatch(page,/\{event\.time\} \{event\.title\}/)});
test("Calendar supports optional end times and Home shows scheduled task starts",()=>{const calendar=read("app/calendar/page.tsx"),home=read("app/page.tsx"),core=read("server/core.mjs");for(const token of ["Start time","End time \\(optional\\)","3600000"])assert.match(calendar+core,new RegExp(token));assert.match(home,/task\.scheduledStartAt/);assert.doesNotMatch(home,/task\.priority\.toLowerCase\(\)/)});

test("Calendar exposes direct manipulation, recurrence scope, and current-time affordances",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");for(const token of ["overlapLayout","onPointerDown","onDrop","calendar-now","This and following","calendar-resize"])assert.match(page,new RegExp(token));assert.match(page,/occurrences\?start/);assert.match(css,/\.calendar-now/);assert.match(read("app/api/v1/events/\[id\]/occurrences/route.ts"),/eventOccurrences/)});
test("Calendar clicks select a column without creating an event, and Month loads its full recurrence range",()=>{const page=read("app/calendar/page.tsx");assert.match(page,/if\(!moved\)return;const setAt=timeAt/);assert.match(page,/const occurrenceRange=view === "Month"/);assert.match(page,/occurrenceRange\.start/);assert.match(page,/occurrenceRange\.end/)});

test("Vault exposes reviewable optimization with mode picker and per-operation diffs",()=>{
  const vault=read("app/vault/page.tsx");assert.match(vault,/Optimization review/);assert.match(vault,/Apply proposal/);assert.match(vault,/\/optimizations/);assert.match(read("server/worker.mjs"),/note-optimize/);
  for(const mode of ["light","organize","study","technical","voice"])assert.match(vault,new RegExp(mode));
  assert.match(vault,/optimization-operations/);assert.match(vault,/op-reason/);
  assert.doesNotMatch(vault,/draft:true\}\)/);
  const core=read("server/core.mjs");assert.doesNotMatch(core,/Only Draft notes can be optimized/);
});

test("Tutor resumes sessions and inserts messages through the API",()=>{
  const panel=read("app/components/TutorPanel.tsx");assert.match(panel,/subjectId=/);assert.match(panel,/sessionId/);assert.match(panel,/\/tutor\/messages\/\$\{[^}]+\}\/insert/);assert.match(panel,/insertedNoteId/);
});

test("Settings exposes opt-in local analytics and deletion",()=>{const page=read("app/settings/page.tsx"),route=read("app/api/v1/analytics/route.ts"),shell=read("app/components/ModuleShell.tsx");assert.match(page,/Local usage analytics/);assert.match(page,/Delete analytics/);assert.match(page,/Off by default/);assert.match(page,/never note or capture content/);assert.match(route,/setAnalyticsEnabled/);assert.match(route,/deleteAnalytics/);assert.match(shell,/event:"navigation"/) });
test("Vault notes support focused fullscreen reading",()=>{const page=read("app/vault/page.tsx"),css=read("app/globals.css");assert.match(page,/Open note fullscreen/);assert.match(css,/note-workspace\.fullscreen/);assert.match(css,/mobile-nav\{display:none\}/)});
test("Settings manages encrypted AI agents in app",()=>{const settings=read("app/settings/page.tsx"),agents=read("app/components/AIAgentSettings.tsx");assert.match(settings,/AIAgentSettings/);assert.match(agents,/Stored encrypted/);assert.doesNotMatch(agents,/value=\{.*apiKey/)});
test("Settings requires explicit confirmation after read-only LifeOS inventory",()=>{const panel=read("app/components/LifeOSMigration.tsx"),route=read("app/api/v1/migrations/lifeos/route.ts");assert.match(panel,/Read-only inventory/);assert.match(panel,/IMPORT_LIFEOS_SOURCE/);assert.match(route,/confirmImport/);assert.match(route,/prepareVaultActivation/);assert.doesNotMatch(`${panel}\n${route}`,/inbox\.md/)});
test("mobile compiler exposes formatting and cursor controls",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/Indent selection/);assert.match(page,/code-symbols/);assert.match(page,/code-joy/)});
test("compiler Scratch buffers recover independently per language",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/noema-scratch-/);assert.match(page,/localStorage\.getItem/);assert.match(page,/localStorage\.setItem/);assert.match(page,/Scratch/)});
test("compiler highlighting is lazy and keeps the textarea fallback",()=>{const page=read("app/coding/compiler/page.tsx"),preview=read("app/components/LazySyntaxPreview.tsx");assert.match(page,/dynamic\(/);assert.match(page,/textarea/);assert.match(page,/Show highlighting/);assert.match(preview,/token/);assert.doesNotMatch(preview,/dangerouslySetInnerHTML/)});
test("compiler starts highlighted and preserves indentation on Enter",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/setHighlight\]=useState\(true\)/);assert.match(page,/event\.key === \"Enter\"/);assert.match(page,/match\(\/\^\[\\t \]\*\//)});
test("compiler line numbers and code body maintain unified typography and baseline alignment",()=>{const css=read("app/globals.css");assert.match(css,/\.code-gutter-inner\{font-family:[^}]*font-size:13px;line-height:22px/);assert.match(css,/\.code-gutter-inner div\{height:22px;line-height:22px/);assert.match(css,/\.code-hl\{[^}]*font-size:13px;line-height:22px/);assert.match(css,/\.code-editor textarea\.code-body\{[^}]*font-size:13px;line-height:22px/)});
test("compiler supports light mode, hides mobile navbar, and redirects mobile back gesture to home",()=>{const css=read("app/globals.css"),page=read("app/coding/compiler/page.tsx");assert.match(css,/:root\[data-theme="light"\] \.compiler-container/);assert.match(css,/:root\[data-theme="light"\] \.code-editor textarea\.code-body\.plain/);assert.match(css,/\.module-shell:has\(\.compiler-container\) \.mobile-nav\{display:none!important\}/);assert.match(page,/popstate/);assert.match(page,/router\.push\("\/"\)/)});
test("automation and Settings share themed form controls",()=>{const css=read("app/globals.css");assert.match(css,/\.automation-builder :is\(input,select,textarea\)/);assert.match(css,/\.settings-content :is\(input,select,textarea\)/)});
test("full tutor allocates its body to the conversation",()=>assert.match(read("app/globals.css"),/\.tutor-panel\.full\{grid-template-rows:64px minmax\(0,1fr\) auto/));
test("Home Capture and Calendar expose mobile thumb-zone actions and inline validation",()=>{
  const home=read("app/page.tsx"),capture=read("app/capture/page.tsx"),calendar=read("app/calendar/page.tsx"),css=read("app/globals.css");
  assert.match(home,/taskTitleError/);assert.match(home,/aria-invalid=\{!!taskTitleError\}/);assert.match(home,/task-title-error/);assert.match(home,/mobile-primary-action/);
  assert.match(capture,/capture-empty[^]*Quick capture/);assert.match(capture,/capture-primary-action/);
  assert.match(calendar,/eventTitleError/);assert.match(calendar,/aria-invalid=\{!!eventTitleError\}/);assert.match(calendar,/event-title-error/);assert.match(calendar,/matchMedia\("\(max-width: 820px\)"\)/);assert.match(calendar,/setView\("Day"\)/);
  for(const selector of ["mobile-primary-action","capture-primary-action","calendar-primary-action"])assert.match(css,new RegExp(`[^}]*\\.${selector}[^}]*\\{[^}]*min-height:48px`));
  assert.match(css,/@media\(max-width:820px\)\{[^]*\.calendar-inspector,\.calendar-popover,\.calendar-scope>div\{[^}]*position:fixed[^}]*bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/\.module-main :is\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),textarea,select\)\{font-size:16px/);
});
test("Home centers attention and capture while task creation floats",()=>{
  const home=read("app/page.tsx"),capture=read("app/capture/page.tsx"),calendar=read("app/calendar/page.tsx"),css=read("app/globals.css");
  assert.match(home,/home-attention-summary/);assert.match(home,/attention-stat review/);assert.match(home,/Capture anything…/);
  assert.match(home,/home-task-fab/);assert.doesNotMatch(home,/home-mobile-dock/);
  assert.doesNotMatch(home,/home-new-task/);
  assert.match(home,/task-overdue-relative/);assert.match(home,/task-due-exact/);assert.match(home,/DotsThree/);
  assert.match(capture,/mobile-action-dock/);assert.match(capture,/Quick capture/);
  assert.doesNotMatch(calendar,/mobile-action-dock/);assert.match(calendar,/calendar-mobile-add/);assert.match(calendar,/aria-label="New event"/);
  assert.match(capture,/import Link from "next\/link"/);assert.match(capture,/<Link className="primary capture-primary-action" href="\/#capture"/);
  assert.doesNotMatch(css,/\.module-main :is\(p,li\)\{font-size:max\(1rem,1em\)\}/);
  assert.match(css,/\.mobile-action-dock\{[^}]*position:fixed[^}]*bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/\.home-task-fab\{[^}]*position:fixed/);assert.match(css,/\.module-main:has\(\.capture-inbox\)/);assert.match(css,/\.module-main:has\(\.calendar-layout\)/);
  assert.match(calendar,/userSelectedView/);assert.match(calendar,/media\.addEventListener\("change"/);assert.match(calendar,/chooseView/);
});
test("Canvas persists versioned workspace objects with pointer, keyboard, and accessible list controls",()=>{const page=read("app/canvas/page.tsx"),engine=read("app/components/InfiniteCanvas.tsx"),routes=[read("app/api/v1/canvases/route.ts"),read("app/api/v1/canvases/[id]/route.ts")].join("\n");assert.match(page,/dynamic\(/);assert.match(engine,/onWheel/);assert.match(engine,/onPointerDown/);assert.match(engine,/ArrowLeft/);assert.match(engine,/longPress/);assert.match(engine,/Undo/);assert.match(engine,/Redo/);assert.match(engine,/Accessible object list/);assert.match(engine,/useAppState/);assert.match(engine,/refId/);assert.match(engine,/version/);assert.match(routes,/requireWorkspace/);assert.match(routes,/saveCanvas/)});
test("Infinite Canvas is retained only as a discontinued legacy surface",()=>{const page=read("app/canvas/page.tsx"),shell=read("app/components/ModuleShell.tsx"),project=read("PROJECT.md"),readme=read("README.md");assert.match(page,/Discontinued/);assert.doesNotMatch(shell,/nav-canvas/);for(const text of [project,readme])assert.match(text,/Canvas[^\n]*[Dd]iscontinued/)});

test("Markdown toolbar and LiveMarkdownEditor use compact labels (H1, H2, H3, P) and horizontal expand toggle",()=>{
  const toolbar=read("app/components/MarkdownToolbar.tsx"),live=read("app/components/LiveMarkdownEditor.tsx"),css=read("app/globals.css");
  for(const label of ["H1","H2","H3"])assert.match(toolbar,new RegExp(`label: "${label}"`));
  assert.match(toolbar,/markdown-toolbar-more-btn/);
  assert.match(toolbar,/DotsThree/);
  for(const option of ['{ label: "P", level: null }','{ label: "H1", level: 1 }','{ label: "H2", level: 2 }','{ label: "H3", level: 3 }'])assert.match(live,new RegExp(option.replace(/[{}[\]()]/g,"\\$&")));
  assert.match(live,/top-bar-more-btn/);
  assert.match(css,/\.live-markdown-editor \.top-bar-heading-label\{min-width:auto/);
  assert.match(css,/\.markdown-toolbar-more-btn,\.top-bar-more-btn/);
  assert.match(css,/\.markdown-toolbar\.expanded/);
});

test("Heading 1 edits in note content sync with note title and file name",()=>{
  const core=read("server/core.mjs"),vault=read("server/vault.mjs"),page=read("app/vault/page.tsx");
  assert.match(core,/const h1Match=content\.match\(\/\^#\\s\+\(\.\+\)\$\/m\)/);
  assert.match(core,/derivedTitle/);
  assert.match(vault,/writeBlockProjection/);
  assert.match(vault,/const h1Match=content\.match\(\/\^#\\s\+\(\.\+\)\$\/m\)/);
  assert.match(vault,/moveVaultEntry/);
  assert.match(page,/handleTitleChange/);
});

test("Vault breadcrumbs display only the tail segment of the directory path",()=>{
  const organizer=read("app/components/VaultOrganizer.tsx");
  assert.match(organizer,/const parentPath = parts\.slice\(0, -1\)\.join\("\/"\)/);
  assert.match(organizer,/const tailPart = parts\[parts\.length - 1\]/);
  assert.match(organizer,/>\.\.\.<\/button>/);
});

test("Raw tag text is converted to a collapsible structured tag widget with clickable pills",()=>{
  const content=read("app/components/MarkdownContent.tsx"),css=read("app/globals.css");
  assert.match(content,/export function extractTagsAndCleanText/);
  assert.match(content,/export function StructuredTags/);
  assert.match(content,/className="note-structured-tags"/);
  assert.match(content,/className="tag-pill"/);
  assert.match(css,/\.note-structured-tags/);
  assert.match(css,/\.tag-pill/);
});

test("extractTagsAndCleanText parses heading tags with escaped backslash brackets",()=>{
  const content=read("app/components/MarkdownContent.tsx");
  assert.match(content,/tags\?/);
  assert.match(content,/standaloneHashtagLineRegex/);
});
