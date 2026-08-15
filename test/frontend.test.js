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
test("Home keeps mobile task controls in a flowing two-row grid",()=>{const page=read("app/page.tsx"),css=read("app/globals.css");assert.match(page,/<span className="task-source"><Flag/);for(const rule of [/\.task-list article\{grid-template-columns:28px minmax\(0,1fr\) auto;[^}]*align-items:start;padding:16px\}/,/\.task-list \.task-check\{grid-column:1;grid-row:1;align-self:start;margin-top:0\}/,/\.task-list \.task-copy\{grid-column:2;grid-row:1;padding:0\}/,/\.task-list \.task-source\{grid-column:2;grid-row:2\}/,/\.task-list article time\{grid-column:3;grid-row:2;justify-self:end;align-self:center;white-space:nowrap\}/,/\.task-list \.row-menu\{grid-column:3;grid-row:1;align-self:start;padding:0\}/])assert.match(css,rule)});
test("Today creates handwriting only after the capture dialog is submitted",()=>{const today=read("app/page.tsx"),capture=read("app/components/HandwritingCapture.tsx");assert.match(today,/aria-label="Write a handwritten note"/);assert.match(today,/<HandwritingCapture/);assert.doesNotMatch(today,/\/vault\?new=ink/);for(const value of ["Quick note","Choose folder","Draft","/api/v1/handwriting-notes","Done"])assert.match(capture,new RegExp(value));assert.match(capture,/disabled=\{[^}]*!strokes\.length/)});
test("handwriting capture uses durable recovery and normalized world coordinates",()=>{const capture=read("app/components/HandwritingCapture.tsx"),editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");assert.match(capture,/normalizeInk/);assert.match(editor,/saveInkDraft/);assert.match(editor,/capture/);assert.match(ink,/coordinateSpace:"world"/)});
test("handwriting canvas navigates and edits in world coordinates",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const value of [/onWheel=/,/"pan","Pan"/,/aria-label="Fit drawing"/,/screenToWorld/,/fitInkView/,/translateStroke/,/snapInkPoint/])assert.match(editor+ink,value);assert.match(editor,/selected\.includes\(stroke\.id\).*translateStroke/s)});
test("ink selection handles and touch input match stylus interactions",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const value of [/startTransform\(event,"scale"\)/,/startTransform\(event,"rotate"\)/,/selectionBounds/,/penUpAt/,/touches\.current\.size===2/])assert.match(editor+ink,value);assert.doesNotMatch(ink,/pointerType!=="touch"/)});
test("handwriting notes expose durable creation and batch-processing endpoints",()=>{const route=read("app/api/v1/handwriting-notes/route.ts"),process=read("app/api/v1/captures/process-pending/route.ts"),service=read("server/handwriting.mjs");assert.match(route,/requireWorkspace\(request,"editor"\)/);assert.match(route,/idempotent/);assert.match(process,/processPendingHandwriting/);assert.match(service,/dedupeKey:`handwriting-intake:/);assert.match(service,/queueOcr:false/)});
test("Capture Done history shows handwriting provenance and its note link",()=>{const page=read("app/capture/page.tsx"),state=read("app/components/AppState.tsx");for(const value of ["Done","AI action","Confidence","Source ink","Open note"])assert.match(page,new RegExp(value));assert.match(state,/handwriting\?:/)});
test("Vault New note action is icon-only",()=>{const vault=read("app/components/VaultOrganizer.tsx");assert.match(vault,/aria-label="New note"/);assert.doesNotMatch(vault,/<FilePlus\/>New note/)});
test("closed Vault sidebar leaves its content pane full width",()=>{const css=read("app/globals.css");assert.match(css,/\.obsidian-vault:not\(\.drawer-open\) \.obsidian-vault-body\{grid-template-columns:minmax\(0,1fr\)\}/)});
test("local worker loads the same environment as Next development",()=>assert.match(JSON.parse(read("package.json")).scripts.worker,/--env-file-if-exists=\.env\.local/));
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
  assert.match(shell,/metaKey\|\|event\.ctrlKey/);
  assert.match(shell,/\/api\/v1\/search\?q=/);
  assert.match(shell,/data\.events\.map/);
  assert.match(shell,/\?open=\$\{item\.id\}/);
  assert.match(shell,/\/api\/v1\/notifications/);
  assert.match(shell,/\/read`,\{method:"POST"/);
  assert.match(read("app/components/ModalDialog.tsx"),/ariaLabel="Search Noema"/);
  assert.match(shell,/Skip to main content/);
});
test("root layout eagerly warms daily navigation routes",()=>{const layout=read("app/layout.tsx"),warmup=read("app/components/NavigationWarmup.tsx");assert.match(layout,/NavigationWarmup/);for(const route of ["capture","calendar","vault","settings"])assert.match(warmup,new RegExp(`/${route}`));assert.doesNotMatch(warmup,/requestIdleCallback/)});

test("mobile navigation exposes core navigation items",()=>{for(const file of ["app/components/ModuleShell.tsx","app/page.tsx"]){const page=read(file);assert.match(page,/\["Home"/);assert.match(page,/\["Vault"/);}});
test("tablet capture and navigation controls avoid credential UI and expose capture tools",()=>{const today=read("app/page.tsx"),shell=read("app/components/ModuleShell.tsx"),css=read("app/globals.css");assert.match(today,/name="quick-capture"/);assert.match(today,/autoComplete="off"/);assert.match(today,/\["Coding","\/coding",Code\]/);assert.match(shell,/\["Coding","\/coding",Code\]/);assert.match(css,/\.mobile-nav \.capture-nav svg\{[^}]*background:transparent/);assert.match(css,/\.capture-tool\{display:grid/)});
test("composite search and capture fields use one visible focus boundary",()=>{const css=read("app/globals.css");assert.match(css,/\.capture input:focus-visible,.vault-organizer-search input:focus-visible\{outline:0\}/);assert.match(css,/\.vault-organizer-search:focus-within\{border-color:var\(--primary\)\}/)});
test("task view selector is functional and themed on mobile",()=>{const tasks=read("app/page.tsx"),css=read("app/globals.css");assert.match(tasks,/<select[^>]*aria-label="Task view"/);assert.match(tasks,/onChange=\{event=>setFilter\(event\.target\.value\)\}/);assert.match(css,/\.task-view-select select\{[^}]*appearance:none/);assert.match(css,/\.task-view-select select option\{background:var\(--surface\);color:var\(--ink\)\}/);assert.match(css,/\.task-view-select:focus-within\{border-color:var\(--primary\)\}/);assert.match(css,/\.task-list \.list-title h3\{display:none\}/)});
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

test("PWA includes offline shell, share target, and raster icons",()=>{
  const manifest=JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.share_target.action,"/capture");
  assert.ok(manifest.icons.some(icon=>icon.sizes==="192x192"));
  assert.ok(manifest.icons.some(icon=>icon.sizes==="512x512"));
  assert.match(read("public/sw.js"),/caches\.open/);
});
test("PWA only announces an actual waiting update",()=>{const pwa=read("app/components/PWARegister.tsx"),worker=read("public/sw.js");assert.match(pwa,/registration\.waiting&&navigator\.serviceWorker\.controller/);assert.match(pwa,/state===\"installed\"/);assert.match(pwa,/skip-waiting/);assert.match(worker,/event\.data\?\.type===\"skip-waiting\"/)});

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
  const shell=read("app/components/ModuleShell.tsx")+read("app/components/ContextualAssistant.tsx");assert.doesNotMatch(shell,/proposal review is the best next action/);assert.match(shell,/\/api\/v1\/recommendations/);assert.match(shell,/Create task/);assert.match(shell,/persisted drafts/);
});

test("Vault renders accessible charts and Mermaid with source fallback",()=>{
  const content=read("app/components/MarkdownContent.tsx"),vault=read("app/vault/page.tsx");assert.match(content,/```\(mermaid\|chart\)/);assert.match(content,/role="img"/);assert.match(content,/<table>/);assert.match(content,/scope="row"/);assert.match(content,/Diagram could not be rendered/);assert.match(content,/View Mermaid source/);assert.match(vault,/MarkdownContent/);
});
test("note editors insert GFM tables and render LaTeX",()=>{const toolbar=read("app/components/MarkdownToolbar.tsx"),content=read("app/components/MarkdownContent.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),live=read("app/components/LiveMarkdownEditor.tsx"),vault=read("app/vault/page.tsx");assert.match(toolbar,/Insert table/);assert.match(toolbar,/Insert display equation/);assert.match(content,/remarkGfm/);assert.match(content,/remarkMath/);assert.match(content,/rehypeKatex/);assert.match(mixed,/LiveMarkdownEditor/);assert.match(live,/Crepe/);assert.match(live,/markdownUpdated/);assert.match(vault,/MarkdownToolbar/)});
test("note editors share deterministic mobile Markdown behavior",()=>{const behavior=read("app/lib/markdownEdit.ts");for(const token of ["pairs","Backspace","Tab","shiftKey","Enter","xX"] )assert.match(behavior,new RegExp(token));assert.match(read("app/vault/page.tsx"),/markdownKey/);assert.match(read("app/components/LiveMarkdownEditor.tsx"),/Crepe/)});
test("full and mixed note editors provide canonical wikilink completion",()=>{const completion=read("app/components/WikilinkCompletion.tsx"),mixed=read("app/components/MixedNoteEditor.tsx");assert.match(completion,/useAppState/);assert.match(completion,/\[\[/);assert.match(completion,/setRangeText/);assert.match(mixed,/MarkdownContent/);assert.match(read("app/vault/page.tsx"),/WikilinkCompletion/)});
test("note attachments use canonical assets and insert Markdown at the caret",()=>{const attachment=read("app/components/NoteAttachmentButton.tsx"),vault=read("app/vault/page.tsx");assert.match(attachment,/\/api\/v1\/assets/);assert.match(attachment,/setRangeText/);assert.match(attachment,/image\//);assert.match(vault,/NoteAttachmentButton/)});
test("notes default to preview while tutor and vault panes remain adjustable",()=>{const tutor=read("app/components/TutorPanel.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),vault=read("app/vault/page.tsx"),organizer=read("app/components/VaultOrganizer.tsx");assert.match(tutor,/MarkdownContent text=\{message\.text\}/);assert.match(tutor,/resizeWidth/);for(const mode of ["minimized","sheet","full"])assert.match(tutor,new RegExp(`"${mode}"`));assert.match(mixed,/viewMode/);assert.match(vault,/\("read"\)/);assert.match(organizer,/noema-vault-drawer/);assert.match(organizer,/aria-expanded=\{drawer\}/)});
test("Obsidian sync is stable and read-only",()=>{const sync=read("scripts/sync-obsidian.mjs");assert.match(sync,/createHash/);assert.match(sync,/Obsidian ·/);assert.match(sync,/readFileSync/);assert.doesNotMatch(sync,/writeFile|unlink|rename|rmSync/)});
test("vault tasks expose live counts, source links, Jakarta scheduling, and discriminated calendar items",()=>{const tasks=read("app/page.tsx"),calendar=read("app/calendar/page.tsx"),state=read("app/components/AppState.tsx");assert.doesNotMatch(tasks,/Four tasks are ready/);assert.match(tasks,/counts=Object\.fromEntries/);assert.match(tasks,/Asia\/Jakarta/);assert.match(tasks,/vaultSource\.relativePath/);assert.match(tasks,/Open source note/);assert.match(state,/kind:"event"/);assert.match(state,/kind:"task"/);assert.match(calendar,/calendarItems\s*\.map\(item => \(item\.kind === "task"/)});
test("mixed handwriting editor preserves offline strokes and pen-first input",()=>{const editor=read("app/components/InkEditor.tsx"),mixed=read("app/components/MixedNoteEditor.tsx"),ink=read("app/lib/ink.ts"),queue=read("app/lib/offlineQueue.ts"),worker=read("server/worker/handlers/handwriting-ocr.mjs");assert.match(editor,/getCoalescedEvents/);assert.match(editor,/pointerType==="pen"/);assert.match(editor,/saveInkDraft/);for(const tool of ["pen","highlighter","eraser","lasso"])assert.match(editor,new RegExp(`"${tool}"`));assert.match(mixed,/blocks/);assert.match(queue,/ink-drafts/);assert.match(ink,/pressure:event\.pressure>0/);assert.match(worker,/strokesToPng/);assert.match(worker,/mimeType:"image\/png"/);assert.doesNotMatch(worker,/mimeType:"image\/svg\+xml"/)});
test("mixed note editor inserts an ink block at the active Markdown caret",()=>{const mixed=read("app/components/MixedNoteEditor.tsx");assert.match(mixed,/insertInk/);assert.match(mixed,/value\.slice\(0,caret\)/);assert.match(mixed,/ids\.splice\(index\+1,0,inkId,afterId\)/)});
test("ink exposes world-edit transforms and geometric tool types",()=>{const editor=read("app/components/InkEditor.tsx"),ink=read("app/lib/ink.ts");for(const tool of ["rectangle","ellipse","arrow","rotateStroke","scaleStroke","formatVersion:2","coordinateSpace:\"world\"","Ruler snap"])assert.match(`${editor}\n${ink}`,new RegExp(tool))});
test("ink replay drops malformed strokes before rendering or transforms",()=>{const ink=read("app/lib/ink.ts"),editor=read("app/components/InkEditor.tsx");assert.match(ink,/sanitizeStrokes/);assert.match(ink,/if\(!a\|\|!b\)return ""/);assert.match(editor,/sanitizeStrokes\(initial\)/);assert.match(editor,/sanitizeStrokes\(draft\?\.strokes\)/)});
test("ink touch gestures pan, pinch, and support two-finger double-tap undo",()=>{const editor=read("app/components/InkEditor.tsx");for(const token of ["touches","pinchDistance","lastTwoTap","pointerType===\"touch\"","viewBox","undo\(\)"])assert.match(editor,new RegExp(token))});
test("ink touch navigation preserves a manual view and pinches around its midpoint",()=>{const editor=read("app/components/InkEditor.tsx");for(const token of ["userInteracted.current = true","pinchAnchor","previousCenter"])assert.match(editor,new RegExp(token))});
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
test("Rich note editing is a single layered reading surface",()=>{const css=read("app/globals.css");for(const token of ["--crepe-base-font-size:14px!important","background:transparent!important;border:0!important","z-index:30!important",".ProseMirror h2{font-size:1.25rem!important",".integrated-doc-container:has(.live-markdown-editor) .integrated-doc-page{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important",".live-markdown-editor .ProseMirror{padding-inline:clamp(20px,3vw,48px)!important"])assert.match(css,new RegExp(token.replace(/[()]/g,"\\$&")))});
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
test("login offers owner-only Google sign-in",()=>{const page=read("app/login/page.tsx"),start=read("app/api/v1/auth/google/route.ts"),callback=read("app/api/v1/auth/google/callback/route.ts");assert.match(page,/Continue with Google/);assert.match(start,/beginGoogleSignIn/);assert.match(start,/ensureDefaultWorkspace\(owner\.id\)/);assert.match(callback,/completeGoogleSignIn/);assert.match(callback,/new URL\(config\.googleLoginRedirectUri\)\.origin/);assert.match(callback,/NOEMA_OWNER_EMAIL/)});

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
test("Calendar Day view shows the full day in its own scroll area",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(page,/Array\.from\(\{length:24\}/);assert.match(page,/dayPositionFor/);assert.match(css,/\.day-view\{height:min\(70dvh,680px\);min-height:0;overflow:auto/);assert.match(css,/\.day-view>\.times,\.day-view>div:last-child\{min-height:1440px/)});
test("Calendar Week view scrolls its all-day row with the timeline and separates timed events and tasks",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");for(const token of ["week-scroll","week-all-day","allDayEvents","allDayTasks","timedEvents","timedTaskItems","formatTimeRange"])assert.match(page,new RegExp(token));assert.match(css,/\.week-scroll\{height:min\(76dvh,820px\);overflow:auto/);assert.match(css,/\.week-day-column/)});
test("Calendar only opens selected-date details when that date has items",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(page,/const hasSelectedItems = selectedTasks\.length \+ selectedEvents\.length > 0/);assert.match(page,/\) : hasSelectedItems \? \(/);assert.match(page,/calendar-popover/);assert.match(css,/\.calendar-layout\{position:relative;display:block/);assert.match(css,/\.calendar-popover\{position:absolute/)});
test("Calendar timelines reserve their scrollbar and contain scroll gestures",()=>{const css=read("app/globals.css");assert.match(css,/scrollbar-gutter:stable/);assert.match(css,/overscroll-behavior:contain/)});
test("Week columns remain readable and can scroll horizontally",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(page,/dates\.map\(\(date,index\)=>/);assert.match(css,/\.week-scroll\{height:min\(76dvh,820px\);overflow:auto/);assert.match(css,/repeat\(7,minmax\(150px,1fr\)\)/)});
test("Month cells keep equal widths and show event names without times",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");assert.match(css,/\.month-scroll>\.month-view\{grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);assert.match(css,/\.month-view>strong,\.month-view>button\{min-width:0;overflow:hidden/);assert.doesNotMatch(page,/\{event\.time\} \{event\.title\}/)});
test("Calendar supports optional end times and Home shows scheduled task starts",()=>{const calendar=read("app/calendar/page.tsx"),home=read("app/page.tsx"),core=read("server/core.mjs");for(const token of ["Start time","End time \\(optional\\)","3600000"])assert.match(calendar+core,new RegExp(token));assert.match(home,/task\.scheduledStartAt/);assert.doesNotMatch(home,/task\.priority\.toLowerCase\(\)/)});

test("Calendar exposes direct manipulation, recurrence scope, and current-time affordances",()=>{const page=read("app/calendar/page.tsx"),css=read("app/globals.css");for(const token of ["overlapLayout","onPointerDown","onDrop","calendar-now","This and following","calendar-resize"])assert.match(page,new RegExp(token));assert.match(page,/occurrences\?start/);assert.match(css,/\.calendar-now/);assert.match(read("app/api/v1/events/\[id\]/occurrences/route.ts"),/eventOccurrences/)});
test("Calendar clicks select a column without creating an event, and Month loads its full recurrence range",()=>{const page=read("app/calendar/page.tsx");assert.match(page,/if\(!moved\)return;const setAt=timeAt/);assert.match(page,/const occurrenceRange=view === "Month"/);assert.match(page,/occurrenceRange\.start/);assert.match(page,/occurrenceRange\.end/)});

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
test("mobile compiler exposes formatting and cursor controls",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/Indent selection/);assert.match(page,/code-symbols/);assert.match(page,/code-joy/)});
test("compiler Scratch buffers recover independently per language",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/noema-scratch-/);assert.match(page,/localStorage\.getItem/);assert.match(page,/localStorage\.setItem/);assert.match(page,/Scratch/)});
test("compiler highlighting is lazy and keeps the textarea fallback",()=>{const page=read("app/coding/compiler/page.tsx"),preview=read("app/components/LazySyntaxPreview.tsx");assert.match(page,/dynamic\(/);assert.match(page,/textarea/);assert.match(page,/Show highlighting/);assert.match(preview,/token/);assert.doesNotMatch(preview,/dangerouslySetInnerHTML/)});
test("compiler starts highlighted and preserves indentation on Enter",()=>{const page=read("app/coding/compiler/page.tsx");assert.match(page,/setHighlight\]=useState\(true\)/);assert.match(page,/event\.key === \"Enter\"/);assert.match(page,/match\(\/\^\[\\t \]\*\//)});
test("automation and Settings share themed form controls",()=>{const css=read("app/globals.css");assert.match(css,/\.automation-builder :is\(input,select,textarea\)/);assert.match(css,/\.settings-content :is\(input,select,textarea\)/)});
test("full tutor allocates its body to the conversation",()=>assert.match(read("app/globals.css"),/\.tutor-panel\.full\{grid-template-rows:64px minmax\(0,1fr\) auto/));
test("Canvas persists versioned workspace objects with pointer, keyboard, and accessible list controls",()=>{const page=read("app/canvas/page.tsx"),engine=read("app/components/InfiniteCanvas.tsx"),routes=[read("app/api/v1/canvases/route.ts"),read("app/api/v1/canvases/[id]/route.ts")].join("\n");assert.match(page,/dynamic\(/);assert.match(engine,/onWheel/);assert.match(engine,/onPointerDown/);assert.match(engine,/ArrowLeft/);assert.match(engine,/longPress/);assert.match(engine,/Undo/);assert.match(engine,/Redo/);assert.match(engine,/Accessible object list/);assert.match(engine,/useAppState/);assert.match(engine,/refId/);assert.match(engine,/version/);assert.match(routes,/requireWorkspace/);assert.match(routes,/saveCanvas/)});
