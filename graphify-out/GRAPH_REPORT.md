# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 789 nodes · 1582 edges · 52 communities (41 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04039795`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- modules.mjs
- core.mjs
- json
- db.mjs
- scripts
- AppState.tsx
- auth.mjs
- offlineQueue.ts
- projects.mjs
- compilerOptions
- google-calendar.mjs
- calendar-sync.mjs
- approvals.mjs
- annotations.mjs
- jobs.mjs
- skills.mjs
- page.tsx
- compiler.mjs
- route.ts
- objects.mjs
- page.tsx
- push.mjs
- ModuleShell.tsx
- page.tsx
- page.tsx
- ai.mjs
- search.mjs
- backend.test.js
- frontend.test.js
- page.tsx
- page.tsx
- page.tsx
- TutorPanel.tsx
- page.tsx
- auth.spec.ts
- page.tsx
- page.tsx
- codex.mjs
- 01-release.spec.ts
- next.config.ts
- next-env.d.ts
- playwright.config.ts
- sw.js
- mjs.d.ts

## God Nodes (most connected - your core abstractions)
1. `json()` - 44 edges
2. `handle()` - 43 edges
3. `requireUser()` - 37 edges
4. `stamp()` - 20 edges
5. `body()` - 19 edges
6. `idempotent()` - 17 edges
7. `now()` - 16 edges
8. `now()` - 16 edges
9. `compilerOptions` - 15 edges
10. `getDatabase()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs
- `GET()` --calls--> `getJob()`  [EXTRACTED]
  app/api/v1/jobs/[id]/route.ts → server/jobs.mjs
- `GET()` --calls--> `listState()`  [EXTRACTED]
  app/api/v1/state/route.ts → server/core.mjs
- `POST()` --calls--> `undoAuditEvent()`  [EXTRACTED]
  app/api/v1/audit/[id]/undo/route.ts → server/core.mjs
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs

## Import Cycles
- None detected.

## Communities (52 total, 11 thin omitted)

### Community 0 - "modules.mjs"
Cohesion: 0.05
Nodes (63): DELETE(), GET(), POST(), PATCH(), POST(), GET(), POST(), POST() (+55 more)

### Community 1 - "core.mjs"
Cohesion: 0.06
Nodes (65): POST(), DELETE(), GET(), GET(), GET(), GET(), POST(), GET() (+57 more)

### Community 2 - "json"
Cohesion: 0.12
Nodes (43): POST(), GET(), POST(), POST(), DELETE(), DELETE(), GET(), POST() (+35 more)

### Community 3 - "db.mjs"
Cohesion: 0.08
Nodes (32): GET(), safe(), PATCH(), GET(), GET(), PATCH(), backup, ensureColumn() (+24 more)

### Community 4 - "scripts"
Cohesion: 0.05
Nodes (43): @axe-core/playwright, next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream (+35 more)

### Community 5 - "AppState.tsx"
Cohesion: 0.07
Nodes (34): blankEvent(), CalendarPage(), days, monday(), reminderValue(), SyncStatus, weekDays(), CaptureInbox() (+26 more)

### Community 6 - "auth.mjs"
Cohesion: 0.15
Nodes (30): POST(), GET(), POST(), auditSecurity(), authenticate(), base32(), beginTotpEnrollment(), changePassword() (+22 more)

### Community 7 - "offlineQueue.ts"
Cohesion: 0.17
Nodes (23): PWARegister(), ServiceNotice(), metadata, viewport, announce(), database(), flushQueue(), listOfflineCaptures() (+15 more)

### Community 8 - "projects.mjs"
Cohesion: 0.15
Nodes (18): POST(), POST(), GET(), DELETE(), POST(), Link, ProjectsPage(), request() (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "google-calendar.mjs"
Cohesion: 0.19
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), beginGoogleOAuth(), completeGoogleOAuth() (+12 more)

### Community 11 - "calendar-sync.mjs"
Cohesion: 0.22
Nodes (18): POST(), GET(), POST(), applyGoogleEvent(), calendarSyncStatus(), claimWrite(), dateInZone(), googlePayload() (+10 more)

### Community 12 - "approvals.mjs"
Cohesion: 0.25
Nodes (13): POST(), GET(), POST(), POST(), actionHash(), approve(), canonical(), consumeApproval() (+5 more)

### Community 13 - "annotations.mjs"
Cohesion: 0.24
Nodes (13): DELETE(), PATCH(), GET(), GET(), POST(), deleteAnnotation(), exportAnnotations(), geometry() (+5 more)

### Community 14 - "jobs.mjs"
Cohesion: 0.28
Nodes (12): GET(), terminal, POST(), addJobEvent(), cancelJob(), claimJob(), enqueueJob(), failJob() (+4 more)

### Community 15 - "skills.mjs"
Cohesion: 0.22
Nodes (13): POST(), GET(), POST(), buildSkillPrompt(), definitions, getSkill(), insertTutorMessage(), loadTutorSession() (+5 more)

### Community 16 - "page.tsx"
Cohesion: 0.15
Nodes (11): Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons, Mfa, request(), sections (+3 more)

### Community 17 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 18 - "route.ts"
Cohesion: 0.33
Nodes (10): DELETE(), GET(), PATCH(), POST(), analyticsStatus(), deleteAnalytics(), recordAnalytics(), schemas (+2 more)

### Community 19 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

### Community 20 - "page.tsx"
Cohesion: 0.21
Nodes (10): Automation, AutomationsPage(), Draft, editDraft(), empty, Metrics, Preview, request() (+2 more)

### Community 21 - "push.mjs"
Cohesion: 0.38
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 22 - "ModuleShell.tsx"
Cohesion: 0.22
Nodes (6): ModuleShell(), nav, Notification, Recommendation, SearchHit, shortcuts

### Community 23 - "page.tsx"
Cohesion: 0.29
Nodes (6): basic(), MarkdownContent(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 24 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 25 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 26 - "search.mjs"
Cohesion: 0.36
Nodes (7): GET(), candidates(), cosine(), key(), searchWorkspace(), text, types

### Community 27 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 28 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 29 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 30 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 31 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 34 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **146 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `CodingPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `StudyPage()` (2× useful, score=1.954494303)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `db.mjs` to `core.mjs`, `json`, `projects.mjs`, `google-calendar.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `objects.mjs`, `push.mjs`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `loadConfig()` connect `json` to `search.mjs`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05042016806722689 - nodes in this community are weakly interconnected._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06160506160506161 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.11794871794871795 - nodes in this community are weakly interconnected._
- **Should `db.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08383838383838384 - nodes in this community are weakly interconnected._