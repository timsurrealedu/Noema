# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1021 nodes · 2308 edges · 58 communities (47 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `95e5b14c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- handle
- modules.mjs
- db.mjs
- plugins.mjs
- collaboration.mjs
- auth.mjs
- scripts
- AppState.tsx
- ModuleShell.tsx
- repositories.mjs
- offlineQueue.ts
- compilerOptions
- google-calendar.mjs
- projects.mjs
- dashboards.mjs
- calendar-sync.mjs
- page.tsx
- jobs.mjs
- approvals.mjs
- annotations.mjs
- skills.mjs
- knowledge-graph.mjs
- page.tsx
- compiler.mjs
- push.mjs
- manifest.json
- recommendations.mjs
- page.tsx
- page.tsx
- ai.mjs
- page.tsx
- backend.test.js
- frontend.test.js
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- 01-release.spec.ts
- page.tsx
- TutorPanel.tsx
- page.tsx
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
1. `handle()` - 83 edges
2. `json()` - 82 edges
3. `requireWorkspace()` - 63 edges
4. `body()` - 31 edges
5. `idempotent()` - 21 edges
6. `findOwned()` - 21 edges
7. `loadConfig()` - 20 edges
8. `getDatabase()` - 20 edges
9. `stamp()` - 20 edges
10. `now()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `handle()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/http.mjs
- `POST()` --calls--> `json()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/http.mjs
- `POST()` --calls--> `requireUser()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/http.mjs
- `GET()` --calls--> `getJob()`  [EXTRACTED]
  app/api/v1/jobs/[id]/route.ts → server/jobs.mjs
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs

## Import Cycles
- None detected.

## Communities (58 total, 11 thin omitted)

### Community 0 - "handle"
Cohesion: 0.06
Nodes (102): GET(), POST(), POST(), GET(), POST(), POST(), POST(), PATCH() (+94 more)

### Community 1 - "modules.mjs"
Cohesion: 0.05
Nodes (75): GET(), DELETE(), GET(), POST(), PATCH(), POST(), POST(), GET() (+67 more)

### Community 2 - "db.mjs"
Cohesion: 0.07
Nodes (41): DELETE(), GET(), PATCH(), POST(), GET(), safe(), GET(), PATCH() (+33 more)

### Community 3 - "plugins.mjs"
Cohesion: 0.09
Nodes (45): POST(), DELETE(), PATCH(), POST(), GET(), GET(), POST(), GET() (+37 more)

### Community 4 - "collaboration.mjs"
Cohesion: 0.11
Nodes (35): POST(), POST(), GET(), POST(), GET(), DELETE(), POST(), PATCH() (+27 more)

### Community 5 - "auth.mjs"
Cohesion: 0.12
Nodes (37): POST(), POST(), DELETE(), GET(), DELETE(), GET(), POST(), POST() (+29 more)

### Community 6 - "scripts"
Cohesion: 0.05
Nodes (43): @axe-core/playwright, next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream (+35 more)

### Community 7 - "AppState.tsx"
Cohesion: 0.07
Nodes (34): blankEvent(), CalendarPage(), days, monday(), reminderValue(), SyncStatus, weekDays(), CaptureInbox() (+26 more)

### Community 8 - "ModuleShell.tsx"
Cohesion: 0.08
Nodes (25): ModuleShell(), nav, Notification, Recommendation, SearchHit, Dashboard, DashboardsPage(), detail() (+17 more)

### Community 9 - "repositories.mjs"
Cohesion: 0.17
Nodes (24): POST(), GET(), POST(), GET(), PATCH(), GET(), POST(), allowed() (+16 more)

### Community 10 - "offlineQueue.ts"
Cohesion: 0.17
Nodes (23): PWARegister(), ServiceNotice(), metadata, viewport, announce(), database(), flushQueue(), listOfflineCaptures() (+15 more)

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

### Community 15 - "calendar-sync.mjs"
Cohesion: 0.22
Nodes (18): POST(), GET(), POST(), applyGoogleEvent(), calendarSyncStatus(), claimWrite(), dateInZone(), googlePayload() (+10 more)

### Community 16 - "page.tsx"
Cohesion: 0.14
Nodes (17): AutomationBuilder(), Condition, Draft, notification(), Props, Step, Automation, AutomationsPage() (+9 more)

### Community 17 - "jobs.mjs"
Cohesion: 0.24
Nodes (13): POST(), GET(), terminal, POST(), addJobEvent(), cancelJob(), claimJob(), enqueueJob() (+5 more)

### Community 18 - "approvals.mjs"
Cohesion: 0.25
Nodes (13): POST(), GET(), POST(), POST(), actionHash(), approve(), canonical(), consumeApproval() (+5 more)

### Community 19 - "annotations.mjs"
Cohesion: 0.24
Nodes (13): DELETE(), PATCH(), GET(), GET(), POST(), deleteAnnotation(), exportAnnotations(), geometry() (+5 more)

### Community 20 - "skills.mjs"
Cohesion: 0.22
Nodes (13): POST(), GET(), POST(), buildSkillPrompt(), definitions, getSkill(), insertTutorMessage(), loadTutorSession() (+5 more)

### Community 21 - "knowledge-graph.mjs"
Cohesion: 0.26
Nodes (11): GET(), GET(), clean(), edgeId(), href, knowledgePath(), nodeId(), queryKnowledgeGraph() (+3 more)

### Community 22 - "page.tsx"
Cohesion: 0.15
Nodes (11): Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons, Mfa, request(), sections (+3 more)

### Community 23 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 24 - "push.mjs"
Cohesion: 0.31
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 25 - "manifest.json"
Cohesion: 0.15
Nodes (12): notifications:write, tasks:read, apiVersion, description, entry, id, integrity, lifeos (+4 more)

### Community 26 - "recommendations.mjs"
Cohesion: 0.44
Nodes (7): PATCH(), GET(), buildRecommendations(), decideRecommendation(), now(), recommendations(), view()

### Community 27 - "page.tsx"
Cohesion: 0.29
Nodes (6): basic(), MarkdownContent(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 28 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 29 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 30 - "page.tsx"
Cohesion: 0.25
Nodes (6): Conflict, Detail, Invitation, Member, Presence, Workspace

### Community 31 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 32 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 33 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 34 - "page.tsx"
Cohesion: 0.33
Nodes (4): Entry, Git, OpenFile, Repo

### Community 35 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 36 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 37 - "01-release.spec.ts"
Cohesion: 0.50
Nodes (3): routes, totp(), verifyRecentMfa()

### Community 41 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **189 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `CodingPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `StudyPage()` (2× useful, score=1.954494303)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `db.mjs` to `handle`, `modules.mjs`, `plugins.mjs`, `collaboration.mjs`, `auth.mjs`, `repositories.mjs`, `google-calendar.mjs`, `projects.mjs`, `dashboards.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `knowledge-graph.mjs`, `recommendations.mjs`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `handle()` connect `handle` to `jobs.mjs`, `auth.mjs`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `json()` connect `handle` to `jobs.mjs`, `auth.mjs`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `handle` be split into smaller, more focused modules?**
  _Cohesion score 0.0644880174291939 - nodes in this community are weakly interconnected._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05083986562150056 - nodes in this community are weakly interconnected._
- **Should `db.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06531986531986532 - nodes in this community are weakly interconnected._