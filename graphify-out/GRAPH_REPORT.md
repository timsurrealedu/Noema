# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 792 nodes · 1590 edges · 65 communities (51 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eb8636af`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- json
- ops.mjs
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
- modules.mjs
- now
- page.tsx
- compiler.mjs
- page.tsx
- route.ts
- objects.mjs
- push.mjs
- ModuleShell.tsx
- page.tsx
- page.tsx
- ai.mjs
- search.mjs
- worker.mjs
- route.ts
- createNotification
- backend.test.js
- frontend.test.js
- route.ts
- page.tsx
- page.tsx
- saveAutomation
- page.tsx
- route.ts
- route.ts
- route.ts
- route.ts
- TutorPanel.tsx
- page.tsx
- auth.spec.ts
- readAllNotifications
- reviewCard
- submitQuiz
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
7. `now()` - 17 edges
8. `now()` - 16 edges
9. `compilerOptions` - 15 edges
10. `getDatabase()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `executeAutomation()`  [EXTRACTED]
  app/api/v1/automations/[id]/runs/route.ts → server/modules.mjs
- `POST()` --calls--> `saveAssignment()`  [EXTRACTED]
  app/api/v1/study/assignments/route.ts → server/modules.mjs
- `POST()` --calls--> `saveCourse()`  [EXTRACTED]
  app/api/v1/study/courses/route.ts → server/modules.mjs
- `POST()` --calls--> `saveQuiz()`  [EXTRACTED]
  app/api/v1/study/quizzes/route.ts → server/modules.mjs
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs

## Import Cycles
- None detected.

## Communities (65 total, 14 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.06
Nodes (65): POST(), DELETE(), GET(), GET(), GET(), GET(), POST(), GET() (+57 more)

### Community 1 - "json"
Cohesion: 0.12
Nodes (43): POST(), GET(), POST(), POST(), DELETE(), DELETE(), GET(), POST() (+35 more)

### Community 2 - "ops.mjs"
Cohesion: 0.08
Nodes (32): GET(), safe(), PATCH(), GET(), GET(), PATCH(), backup, ensureColumn() (+24 more)

### Community 3 - "scripts"
Cohesion: 0.05
Nodes (43): @axe-core/playwright, next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream (+35 more)

### Community 4 - "AppState.tsx"
Cohesion: 0.07
Nodes (34): blankEvent(), CalendarPage(), days, monday(), reminderValue(), SyncStatus, weekDays(), CaptureInbox() (+26 more)

### Community 5 - "auth.mjs"
Cohesion: 0.15
Nodes (30): POST(), GET(), POST(), auditSecurity(), authenticate(), base32(), beginTotpEnrollment(), changePassword() (+22 more)

### Community 6 - "offlineQueue.ts"
Cohesion: 0.17
Nodes (23): PWARegister(), ServiceNotice(), metadata, viewport, announce(), database(), flushQueue(), listOfflineCaptures() (+15 more)

### Community 7 - "projects.mjs"
Cohesion: 0.15
Nodes (18): POST(), POST(), GET(), DELETE(), POST(), Link, ProjectsPage(), request() (+10 more)

### Community 8 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 9 - "google-calendar.mjs"
Cohesion: 0.19
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), beginGoogleOAuth(), completeGoogleOAuth() (+12 more)

### Community 10 - "calendar-sync.mjs"
Cohesion: 0.22
Nodes (18): POST(), GET(), POST(), applyGoogleEvent(), calendarSyncStatus(), claimWrite(), dateInZone(), googlePayload() (+10 more)

### Community 11 - "approvals.mjs"
Cohesion: 0.25
Nodes (13): POST(), GET(), POST(), POST(), actionHash(), approve(), canonical(), consumeApproval() (+5 more)

### Community 12 - "annotations.mjs"
Cohesion: 0.24
Nodes (13): DELETE(), PATCH(), GET(), GET(), POST(), deleteAnnotation(), exportAnnotations(), geometry() (+5 more)

### Community 13 - "jobs.mjs"
Cohesion: 0.28
Nodes (12): GET(), terminal, POST(), addJobEvent(), cancelJob(), claimJob(), enqueueJob(), failJob() (+4 more)

### Community 14 - "skills.mjs"
Cohesion: 0.22
Nodes (13): POST(), GET(), POST(), buildSkillPrompt(), definitions, getSkill(), insertTutorMessage(), loadTutorSession() (+5 more)

### Community 15 - "modules.mjs"
Cohesion: 0.22
Nodes (11): DELETE(), POST(), POST(), automationDefinition(), conditionMatches(), cronField(), deleteAutomation(), previewAutomation() (+3 more)

### Community 16 - "now"
Cohesion: 0.27
Nodes (13): GET(), POST(), dueCards(), executeAutomation(), finishAutomationRun(), now(), saveAssignment(), saveCard() (+5 more)

### Community 17 - "page.tsx"
Cohesion: 0.15
Nodes (11): Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons, Mfa, request(), sections (+3 more)

### Community 18 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 19 - "page.tsx"
Cohesion: 0.19
Nodes (11): Automation, AutomationsPage(), Condition, Draft, editDraft(), empty, Metrics, Preview (+3 more)

### Community 20 - "route.ts"
Cohesion: 0.33
Nodes (10): DELETE(), GET(), PATCH(), POST(), analyticsStatus(), deleteAnalytics(), recordAnalytics(), schemas (+2 more)

### Community 21 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

### Community 22 - "push.mjs"
Cohesion: 0.38
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 23 - "ModuleShell.tsx"
Cohesion: 0.22
Nodes (6): ModuleShell(), nav, Notification, Recommendation, SearchHit, shortcuts

### Community 24 - "page.tsx"
Cohesion: 0.29
Nodes (6): basic(), MarkdownContent(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 25 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 26 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 27 - "search.mjs"
Cohesion: 0.36
Nodes (7): GET(), candidates(), cosine(), key(), searchWorkspace(), text, types

### Community 28 - "worker.mjs"
Cohesion: 0.36
Nodes (7): cronDue(), deliverDueReminders(), runScheduledAutomations(), optimizationSchema, runOne(), schema, startWorker()

### Community 29 - "route.ts"
Cohesion: 0.43
Nodes (4): GET(), POST(), automationMetrics(), automationRuns()

### Community 30 - "createNotification"
Cohesion: 0.38
Nodes (4): GET(), POST(), createNotification(), listNotifications()

### Community 31 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 32 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 33 - "route.ts"
Cohesion: 0.47
Nodes (4): DELETE(), POST(), deletePushSubscription(), savePushSubscription()

### Community 34 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 35 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 36 - "saveAutomation"
Cohesion: 0.60
Nodes (4): GET(), POST(), listAutomations(), saveAutomation()

### Community 37 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 38 - "route.ts"
Cohesion: 0.83
Nodes (3): PATCH(), cancelAutomationRun(), retryAutomationRun()

### Community 39 - "route.ts"
Cohesion: 0.67
Nodes (3): GET(), POST(), listAssignments()

### Community 40 - "route.ts"
Cohesion: 0.67
Nodes (3): GET(), POST(), listCourses()

### Community 41 - "route.ts"
Cohesion: 0.67
Nodes (3): GET(), POST(), listQuizzes()

### Community 44 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **147 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `CodingPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `StudyPage()` (2× useful, score=1.954494303)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `ops.mjs` to `json`, `projects.mjs`, `google-calendar.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `objects.mjs`, `push.mjs`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06160506160506161 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.11794871794871795 - nodes in this community are weakly interconnected._
- **Should `ops.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08383838383838384 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `AppState.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07439024390243902 - nodes in this community are weakly interconnected._