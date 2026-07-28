# Graph Report - .  (2026-07-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1256 nodes · 2838 edges · 92 communities (80 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d0399a1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- modules.mjs
- loadConfig
- vault.mjs
- collaboration.mjs
- json
- core.mjs
- handle
- auth.mjs
- repositories.mjs
- offlineQueue.ts
- db.mjs
- compilerOptions
- google-calendar.mjs
- projects.mjs
- dashboards.mjs
- findOwned
- calendar-sync.mjs
- page.tsx
- page.tsx
- dependencies
- interpret-capture.mjs
- InkEditor.tsx
- approvals.mjs
- annotations.mjs
- jobs.mjs
- scripts
- skills.mjs
- AppState.tsx
- ai-agents.mjs
- ModuleShell.tsx
- page.tsx
- devDependencies
- ai.mjs
- knowledge-graph.mjs
- push.mjs
- page.tsx
- page.tsx
- manifest.json
- route.ts
- objects.mjs
- recommendations.mjs
- page.tsx
- page.tsx
- search.mjs
- VaultOrganizer.tsx
- page.tsx
- page.tsx
- worker.mjs
- page.tsx
- sync-obsidian.mjs
- layout.tsx
- page.tsx
- retrieveSkillContext
- backend.test.js
- frontend.test.js
- page.tsx
- optimize-note.mjs
- page.tsx
- createFileCapture
- route.ts
- page.tsx
- page.tsx
- vault-task-writeback.mjs
- 01-release.spec.ts
- package.json
- auth.spec.ts
- route.ts
- page.tsx
- playwright.config.ts
- codex.mjs
- migrate.mjs
- next.config.ts
- next-env.d.ts
- @phosphor-icons/react
- web-push
- sw.js
- mjs.d.ts
- index.mjs

## God Nodes (most connected - your core abstractions)
1. `handle()` - 71 edges
2. `json()` - 70 edges
3. `requireWorkspace()` - 60 edges
4. `loadConfig()` - 35 edges
5. `getDatabase()` - 26 edges
6. `body()` - 25 edges
7. `findOwned()` - 21 edges
8. `now()` - 20 edges
9. `stamp()` - 20 edges
10. `fail()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `CompilerPage()` --indirect_call--> `key()`  [INFERRED]
  app/coding/compiler/page.tsx → server/ai-agents.mjs
- `AppStateProvider()` --indirect_call--> `key()`  [INFERRED]
  app/components/AppState.tsx → server/ai-agents.mjs
- `ModuleShell()` --indirect_call--> `key()`  [INFERRED]
  app/components/ModuleShell.tsx → server/ai-agents.mjs
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs
- `POST()` --calls--> `json()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/http.mjs

## Import Cycles
- None detected.

## Communities (92 total, 12 thin omitted)

### Community 0 - "modules.mjs"
Cohesion: 0.05
Nodes (71): GET(), DELETE(), GET(), POST(), PATCH(), POST(), POST(), GET() (+63 more)

### Community 1 - "loadConfig"
Cohesion: 0.06
Nodes (63): POST(), GET(), safe(), POST(), GET(), DELETE(), PATCH(), POST() (+55 more)

### Community 2 - "vault.mjs"
Cohesion: 0.07
Nodes (60): POST(), PATCH(), DELETE(), PATCH(), GET(), PATCH(), POST(), POST() (+52 more)

### Community 3 - "collaboration.mjs"
Cohesion: 0.11
Nodes (35): POST(), POST(), GET(), POST(), GET(), DELETE(), POST(), PATCH() (+27 more)

### Community 4 - "json"
Cohesion: 0.17
Nodes (26): POST(), POST(), PATCH(), DELETE(), POST(), GET(), POST(), POST() (+18 more)

### Community 5 - "core.mjs"
Cohesion: 0.11
Nodes (33): POST(), GET(), absolute(), applyInverse(), captureActionCleaners, captureActionDetail(), captureObjects(), cleanCaptureAction() (+25 more)

### Community 6 - "handle"
Cohesion: 0.14
Nodes (24): GET(), POST(), DELETE(), DELETE(), GET(), POST(), GET(), GET() (+16 more)

### Community 7 - "auth.mjs"
Cohesion: 0.15
Nodes (30): POST(), GET(), POST(), auditSecurity(), authenticate(), base32(), beginTotpEnrollment(), changePassword() (+22 more)

### Community 8 - "repositories.mjs"
Cohesion: 0.17
Nodes (24): POST(), GET(), POST(), GET(), PATCH(), GET(), POST(), allowed() (+16 more)

### Community 9 - "offlineQueue.ts"
Cohesion: 0.20
Nodes (25): PWARegister(), announce(), database(), deleteInkDraft(), flushQueue(), InkDraft, listOfflineCaptures(), listPending() (+17 more)

### Community 10 - "db.mjs"
Cohesion: 0.17
Nodes (18): POST(), POST(), GET(), GET(), PATCH(), POST(), ensureColumn(), getDatabase() (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 12 - "google-calendar.mjs"
Cohesion: 0.19
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), beginGoogleOAuth(), completeGoogleOAuth() (+12 more)

### Community 13 - "projects.mjs"
Cohesion: 0.19
Nodes (18): POST(), POST(), DELETE(), POST(), Link, ProjectsPage(), request(), Workspace (+10 more)

### Community 14 - "dashboards.mjs"
Cohesion: 0.18
Nodes (18): DELETE(), GET(), POST(), POST(), GET(), POST(), dashboardView(), deleteDashboard() (+10 more)

### Community 15 - "findOwned"
Cohesion: 0.29
Nodes (21): POST(), actorInfo(), applyCaptureAction(), applyCaptureInterpretation(), applyNoteOptimization(), audit(), createCapture(), deleteEvent() (+13 more)

### Community 16 - "calendar-sync.mjs"
Cohesion: 0.22
Nodes (18): POST(), GET(), POST(), applyGoogleEvent(), calendarSyncStatus(), claimWrite(), dateInZone(), googlePayload() (+10 more)

### Community 17 - "page.tsx"
Cohesion: 0.14
Nodes (17): AutomationBuilder(), Condition, Draft, notification(), Props, Step, Automation, AutomationsPage() (+9 more)

### Community 18 - "page.tsx"
Cohesion: 0.12
Nodes (15): Agent, AIAgentSettings(), providers, Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons (+7 more)

### Community 19 - "dependencies"
Cohesion: 0.11
Nodes (19): katex, next, dependencies, katex, next, react, react-dom, react-markdown (+11 more)

### Community 20 - "interpret-capture.mjs"
Cohesion: 0.16
Nodes (14): chunk(), crc32(), strokesToPng(), table, failJob(), handlers, UnsupportedJobKindError, handleHandwritingOcr() (+6 more)

### Community 21 - "InkEditor.tsx"
Cohesion: 0.18
Nodes (12): InkEditor(), Props, Action, actions, MarkdownToolbar(), Block, acceptInkPointer(), eraseAt() (+4 more)

### Community 22 - "approvals.mjs"
Cohesion: 0.25
Nodes (13): POST(), GET(), POST(), POST(), actionHash(), approve(), canonical(), consumeApproval() (+5 more)

### Community 23 - "annotations.mjs"
Cohesion: 0.24
Nodes (13): DELETE(), PATCH(), GET(), GET(), POST(), deleteAnnotation(), exportAnnotations(), geometry() (+5 more)

### Community 24 - "jobs.mjs"
Cohesion: 0.25
Nodes (12): POST(), GET(), terminal, POST(), GET(), addJobEvent(), cancelJob(), claimJob() (+4 more)

### Community 25 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, backup, build, dev, import:v1, lint, start, sync:obsidian (+9 more)

### Community 26 - "skills.mjs"
Cohesion: 0.22
Nodes (13): POST(), GET(), POST(), buildSkillPrompt(), definitions, getSkill(), insertTutorMessage(), loadTutorSession() (+5 more)

### Community 27 - "AppState.tsx"
Cohesion: 0.14
Nodes (15): api(), AppData, AppState, AppStateProvider(), CalendarItem, CaptureObject, Context, NoteBlockSummary (+7 more)

### Community 28 - "ai-agents.mjs"
Cohesion: 0.25
Nodes (13): DELETE(), GET(), POST(), deleteAIAgent(), key(), listAIAgents(), open(), profiles (+5 more)

### Community 29 - "ModuleShell.tsx"
Cohesion: 0.16
Nodes (8): Approval, Repository, ModuleShell(), nav, Notification, Recommendation, SearchHit, shortcuts

### Community 30 - "page.tsx"
Cohesion: 0.16
Nodes (10): Approval, CompilerPage(), Language, Result, starters, basic(), MarkdownContent(), Message (+2 more)

### Community 31 - "devDependencies"
Cohesion: 0.13
Nodes (15): @axe-core/playwright, devDependencies, @axe-core/playwright, @playwright/test, @types/node, @types/react, @types/react-dom, @types/tar-stream (+7 more)

### Community 32 - "ai.mjs"
Cohesion: 0.30
Nodes (14): configuredChain(), geminiSchema(), isCapacityError(), isTransientAIError(), parseJSON(), presets, runAI(), runCompatible() (+6 more)

### Community 33 - "knowledge-graph.mjs"
Cohesion: 0.26
Nodes (11): GET(), GET(), clean(), edgeId(), href, knowledgePath(), nodeId(), queryKnowledgeGraph() (+3 more)

### Community 34 - "push.mjs"
Cohesion: 0.31
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 35 - "page.tsx"
Cohesion: 0.21
Nodes (10): CaptureInbox(), CaptureRow(), Filter, filters, matches(), sourceMeta, statusMeta, timeFor() (+2 more)

### Community 36 - "page.tsx"
Cohesion: 0.27
Nodes (11): Task, useAppState(), jakartaDate(), nav, Today(), blankTask(), dateTimeValue(), dateValue() (+3 more)

### Community 37 - "manifest.json"
Cohesion: 0.15
Nodes (12): notifications:write, tasks:read, apiVersion, description, entry, id, integrity, name (+4 more)

### Community 38 - "route.ts"
Cohesion: 0.33
Nodes (10): DELETE(), GET(), PATCH(), POST(), analyticsStatus(), deleteAnalytics(), recordAnalytics(), schemas (+2 more)

### Community 39 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

### Community 40 - "recommendations.mjs"
Cohesion: 0.44
Nodes (7): PATCH(), GET(), buildRecommendations(), decideRecommendation(), now(), recommendations(), view()

### Community 41 - "page.tsx"
Cohesion: 0.31
Nodes (9): blankEvent(), CalendarPage(), days, monday(), positionFor(), reminderValue(), SyncStatus, weekDays() (+1 more)

### Community 42 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 43 - "search.mjs"
Cohesion: 0.36
Nodes (7): GET(), candidates(), cosine(), key(), searchWorkspace(), text, types

### Community 44 - "VaultOrganizer.tsx"
Cohesion: 0.25
Nodes (6): Note, findFolder(), Tree, TreeNote, VaultOrganizer(), VaultSource

### Community 45 - "page.tsx"
Cohesion: 0.25
Nodes (6): ModalDialog(), Catalog, Inspection, Installed, Manifest, permissionCopy

### Community 46 - "page.tsx"
Cohesion: 0.33
Nodes (8): Dashboard, DashboardsPage(), detail(), label(), overlaps(), request(), types, Widget

### Community 47 - "worker.mjs"
Cohesion: 0.42
Nodes (6): assertNotCancelled(), processClaimedJob(), runScheduledWork(), syncVaults(), runOne(), startWorker()

### Community 48 - "page.tsx"
Cohesion: 0.25
Nodes (6): Conflict, Detail, Invitation, Member, Presence, Workspace

### Community 49 - "sync-obsidian.mjs"
Cohesion: 0.25
Nodes (4): db, root, skipped, user

### Community 50 - "layout.tsx"
Cohesion: 0.33
Nodes (3): ServiceNotice(), metadata, viewport

### Community 51 - "page.tsx"
Cohesion: 0.33
Nodes (6): colors, Edge, Graph, GraphPage(), Node, request()

### Community 52 - "retrieveSkillContext"
Cohesion: 0.52
Nodes (5): excerpt(), retrieveSkillContext(), score(), terms(), handleRunSkill()

### Community 53 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,statSync,symlinkSync,writeFileSync}, {join}, test, {tmpdir}

### Community 54 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 55 - "page.tsx"
Cohesion: 0.33
Nodes (4): Entry, Git, OpenFile, Repo

### Community 56 - "optimize-note.mjs"
Cohesion: 0.47
Nodes (5): failNoteOptimization(), finishNoteOptimization(), handleOptimizeNote(), instructions, schema

### Community 57 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 58 - "createFileCapture"
Cohesion: 0.50
Nodes (4): POST(), createFileCapture(), fileKind(), formatSize()

### Community 59 - "route.ts"
Cohesion: 0.60
Nodes (4): GET(), POST(), noteOptimizations(), requestNoteOptimization()

### Community 60 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 61 - "page.tsx"
Cohesion: 0.60
Nodes (4): blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 62 - "vault-task-writeback.mjs"
Cohesion: 0.60
Nodes (3): dateParts(), prepareVaultTaskWriteback(), vaultTaskRepresentation()

### Community 63 - "01-release.spec.ts"
Cohesion: 0.50
Nodes (3): routes, totp(), verifyRecentMfa()

### Community 64 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 65 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **228 isolated node(s):** `target`, `dom`, `dom.iterable`, `esnext`, `allowJs` (+223 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.925688023)
- `CodingPage()` (2× useful, score=1.925688023)
- `StudyPage()` (2× useful, score=1.925688023)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `key()` connect `ai-agents.mjs` to `ai.mjs`, `AppState.tsx`, `ModuleShell.tsx`, `page.tsx`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `getDatabase()` connect `db.mjs` to `loadConfig`, `vault.mjs`, `collaboration.mjs`, `core.mjs`, `route.ts`, `handle`, `objects.mjs`, `recommendations.mjs`, `search.mjs`, `dashboards.mjs`, `worker.mjs`, `sync-obsidian.mjs`, `approvals.mjs`, `jobs.mjs`, `ai-agents.mjs`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `ModuleShell()` connect `ModuleShell.tsx` to `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `ai-agents.mjs`, `page.tsx`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `target`, `dom`, `dom.iterable` to the rest of the system?**
  _228 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05318352059925094 - nodes in this community are weakly interconnected._
- **Should `loadConfig` be split into smaller, more focused modules?**
  _Cohesion score 0.05917721518987342 - nodes in this community are weakly interconnected._
- **Should `vault.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07092907092907093 - nodes in this community are weakly interconnected._