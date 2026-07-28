# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1075 nodes · 2395 edges · 64 communities (55 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7400ae7d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- handle
- modules.mjs
- loadConfig
- core.mjs
- db.mjs
- scripts
- collaboration.mjs
- auth.mjs
- repositories.mjs
- dispatch.mjs
- jobs.mjs
- skills.mjs
- compilerOptions
- google-calendar.mjs
- projects.mjs
- offlineQueue.ts
- dashboards.mjs
- calendar-sync.mjs
- page.tsx
- approvals.mjs
- annotations.mjs
- ModuleShell.tsx
- knowledge-graph.mjs
- page.tsx
- push.mjs
- page.tsx
- AppState.tsx
- manifest.json
- useAppState
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- backend.test.js
- frontend.test.js
- page.tsx
- page.tsx
- page.tsx
- MarkdownContent.tsx
- page.tsx
- page.tsx
- 01-release.spec.ts
- auth.spec.ts
- page.tsx
- playwright.config.ts
- codex.mjs
- next.config.ts
- next-env.d.ts
- sw.js
- mjs.d.ts
- index.mjs

## God Nodes (most connected - your core abstractions)
1. `handle()` - 75 edges
2. `json()` - 74 edges
3. `requireWorkspace()` - 62 edges
4. `body()` - 29 edges
5. `loadConfig()` - 27 edges
6. `findOwned()` - 21 edges
7. `now()` - 20 edges
8. `stamp()` - 20 edges
9. `idempotent()` - 19 edges
10. `actorInfo()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs
- `POST()` --calls--> `ensureOwner()`  [EXTRACTED]
  app/api/v1/auth/login/route.ts → server/auth.mjs
- `POST()` --calls--> `login()`  [EXTRACTED]
  app/api/v1/auth/login/route.ts → server/auth.mjs
- `POST()` --calls--> `loadConfig()`  [EXTRACTED]
  app/api/v1/auth/login/route.ts → server/config.mjs
- `GET()` --calls--> `mfaStatus()`  [EXTRACTED]
  app/api/v1/auth/totp/route.ts → server/auth.mjs

## Import Cycles
- None detected.

## Communities (64 total, 9 thin omitted)

### Community 0 - "handle"
Cohesion: 0.08
Nodes (60): GET(), POST(), POST(), GET(), POST(), POST(), DELETE(), DELETE() (+52 more)

### Community 1 - "modules.mjs"
Cohesion: 0.05
Nodes (71): GET(), DELETE(), GET(), POST(), PATCH(), POST(), POST(), GET() (+63 more)

### Community 2 - "loadConfig"
Cohesion: 0.06
Nodes (62): GET(), safe(), POST(), GET(), DELETE(), PATCH(), POST(), GET() (+54 more)

### Community 3 - "core.mjs"
Cohesion: 0.10
Nodes (61): absolute(), actorInfo(), applyCaptureAction(), applyCaptureInterpretation(), applyInverse(), applyNoteOptimization(), audit(), backlinksForNote() (+53 more)

### Community 4 - "db.mjs"
Cohesion: 0.07
Nodes (40): DELETE(), GET(), PATCH(), POST(), PATCH(), GET(), GET(), GET() (+32 more)

### Community 5 - "scripts"
Cohesion: 0.04
Nodes (47): @axe-core/playwright, next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream (+39 more)

### Community 6 - "collaboration.mjs"
Cohesion: 0.11
Nodes (35): POST(), POST(), GET(), POST(), GET(), DELETE(), POST(), PATCH() (+27 more)

### Community 7 - "auth.mjs"
Cohesion: 0.15
Nodes (31): POST(), GET(), POST(), POST(), auditSecurity(), authenticate(), base32(), beginTotpEnrollment() (+23 more)

### Community 8 - "repositories.mjs"
Cohesion: 0.17
Nodes (24): POST(), GET(), POST(), GET(), PATCH(), GET(), POST(), allowed() (+16 more)

### Community 9 - "dispatch.mjs"
Cohesion: 0.11
Nodes (20): excerpt(), retrieveSkillContext(), score(), terms(), handlers, processClaimedJob(), UnsupportedJobKindError, captureProposalSchema (+12 more)

### Community 10 - "jobs.mjs"
Cohesion: 0.16
Nodes (17): POST(), POST(), POST(), GET(), terminal, POST(), GET(), POST() (+9 more)

### Community 11 - "skills.mjs"
Cohesion: 0.14
Nodes (22): POST(), GET(), POST(), geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini() (+14 more)

### Community 12 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 13 - "google-calendar.mjs"
Cohesion: 0.19
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), beginGoogleOAuth(), completeGoogleOAuth() (+12 more)

### Community 14 - "projects.mjs"
Cohesion: 0.19
Nodes (18): POST(), POST(), DELETE(), POST(), Link, ProjectsPage(), request(), Workspace (+10 more)

### Community 15 - "offlineQueue.ts"
Cohesion: 0.24
Nodes (21): PWARegister(), announce(), database(), flushQueue(), listOfflineCaptures(), listPending(), listQueued(), migrateLegacy() (+13 more)

### Community 16 - "dashboards.mjs"
Cohesion: 0.18
Nodes (18): DELETE(), GET(), POST(), POST(), GET(), POST(), dashboardView(), deleteDashboard() (+10 more)

### Community 17 - "calendar-sync.mjs"
Cohesion: 0.22
Nodes (18): POST(), GET(), POST(), applyGoogleEvent(), calendarSyncStatus(), claimWrite(), dateInZone(), googlePayload() (+10 more)

### Community 18 - "page.tsx"
Cohesion: 0.14
Nodes (17): AutomationBuilder(), Condition, Draft, notification(), Props, Step, Automation, AutomationsPage() (+9 more)

### Community 19 - "approvals.mjs"
Cohesion: 0.25
Nodes (13): POST(), GET(), POST(), POST(), actionHash(), approve(), canonical(), consumeApproval() (+5 more)

### Community 20 - "annotations.mjs"
Cohesion: 0.24
Nodes (13): DELETE(), PATCH(), GET(), GET(), POST(), deleteAnnotation(), exportAnnotations(), geometry() (+5 more)

### Community 21 - "ModuleShell.tsx"
Cohesion: 0.16
Nodes (8): Approval, Repository, ModuleShell(), nav, Notification, Recommendation, SearchHit, shortcuts

### Community 22 - "knowledge-graph.mjs"
Cohesion: 0.26
Nodes (11): GET(), GET(), clean(), edgeId(), href, knowledgePath(), nodeId(), queryKnowledgeGraph() (+3 more)

### Community 23 - "page.tsx"
Cohesion: 0.15
Nodes (11): Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons, Mfa, request(), sections (+3 more)

### Community 24 - "push.mjs"
Cohesion: 0.31
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 25 - "page.tsx"
Cohesion: 0.21
Nodes (10): CaptureInbox(), CaptureRow(), Filter, filters, matches(), sourceMeta, statusMeta, timeFor() (+2 more)

### Community 26 - "AppState.tsx"
Cohesion: 0.18
Nodes (12): api(), AppData, AppState, AppStateProvider(), CaptureObject, Context, NoteLink, Project (+4 more)

### Community 27 - "manifest.json"
Cohesion: 0.15
Nodes (12): notifications:write, tasks:read, apiVersion, description, entry, id, integrity, name (+4 more)

### Community 28 - "useAppState"
Cohesion: 0.21
Nodes (8): useAppState(), ServiceNotice(), showUnavailable(), metadata, viewport, activity, nav, Today()

### Community 29 - "page.tsx"
Cohesion: 0.29
Nodes (8): blankEvent(), CalendarPage(), days, monday(), reminderValue(), SyncStatus, weekDays(), Event

### Community 30 - "page.tsx"
Cohesion: 0.27
Nodes (8): Note, Message, Props, TutorPanel(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 31 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 32 - "page.tsx"
Cohesion: 0.25
Nodes (6): ModalDialog(), Catalog, Inspection, Installed, Manifest, permissionCopy

### Community 33 - "page.tsx"
Cohesion: 0.33
Nodes (8): Dashboard, DashboardsPage(), detail(), label(), overlaps(), request(), types, Widget

### Community 34 - "page.tsx"
Cohesion: 0.25
Nodes (6): Conflict, Detail, Invitation, Member, Presence, Workspace

### Community 35 - "page.tsx"
Cohesion: 0.33
Nodes (6): colors, Edge, Graph, GraphPage(), Node, request()

### Community 36 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 37 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 38 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 39 - "page.tsx"
Cohesion: 0.33
Nodes (4): Entry, Git, OpenFile, Repo

### Community 40 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 42 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 43 - "page.tsx"
Cohesion: 0.70
Nodes (4): blankTask(), dateValue(), reminderValue(), TasksPage()

### Community 44 - "01-release.spec.ts"
Cohesion: 0.50
Nodes (3): routes, totp(), verifyRecentMfa()

### Community 45 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **200 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.925688023)
- `CodingPage()` (2× useful, score=1.925688023)
- `StudyPage()` (2× useful, score=1.925688023)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `loadConfig()` connect `loadConfig` to `handle`, `auth.mjs`, `repositories.mjs`, `skills.mjs`, `google-calendar.mjs`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `getJob()` connect `jobs.mjs` to `modules.mjs`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `getDatabase()` connect `db.mjs` to `dashboards.mjs`, `handle`, `approvals.mjs`, `collaboration.mjs`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `handle` be split into smaller, more focused modules?**
  _Cohesion score 0.08485273492286115 - nodes in this community are weakly interconnected._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05318352059925094 - nodes in this community are weakly interconnected._
- **Should `loadConfig` be split into smaller, more focused modules?**
  _Cohesion score 0.060939060939060936 - nodes in this community are weakly interconnected._