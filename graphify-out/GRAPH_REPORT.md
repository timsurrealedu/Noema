# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 822 nodes · 1661 edges · 69 communities (51 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6974ba28`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- db.mjs
- scripts
- AppState.tsx
- auth.mjs
- offlineQueue.ts
- projects.mjs
- compilerOptions
- google-calendar.mjs
- calendar-sync.mjs
- config.mjs
- page.tsx
- approvals.mjs
- annotations.mjs
- jobs.mjs
- skills.mjs
- knowledge-graph.mjs
- page.tsx
- now
- modules.mjs
- compiler.mjs
- route.ts
- objects.mjs
- saveAssignment
- push.mjs
- ModuleShell.tsx
- page.tsx
- page.tsx
- ai.mjs
- worker.mjs
- createNotification
- backend.test.js
- frontend.test.js
- route.ts
- route.ts
- page.tsx
- page.tsx
- route.ts
- saveCard
- saveCourse
- saveQuiz
- page.tsx
- TutorPanel.tsx
- page.tsx
- auth.spec.ts
- route.ts
- testAutomation
- route.ts
- route.ts
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
5. `now()` - 20 edges
6. `body()` - 19 edges
7. `idempotent()` - 17 edges
8. `now()` - 16 edges
9. `getDatabase()` - 16 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs
- `GET()` --calls--> `getJob()`  [EXTRACTED]
  app/api/v1/jobs/[id]/route.ts → server/jobs.mjs
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs
- `POST()` --calls--> `getSkill()`  [EXTRACTED]
  app/api/v1/skills/[name]/run/route.ts → server/skills.mjs
- `POST()` --calls--> `storeAsset()`  [EXTRACTED]
  app/api/v1/assets/route.ts → server/objects.mjs

## Import Cycles
- None detected.

## Communities (69 total, 18 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.06
Nodes (93): POST(), GET(), POST(), POST(), DELETE(), DELETE(), GET(), POST() (+85 more)

### Community 1 - "db.mjs"
Cohesion: 0.08
Nodes (32): GET(), safe(), PATCH(), GET(), GET(), PATCH(), backup, ensureColumn() (+24 more)

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (43): @axe-core/playwright, next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream (+35 more)

### Community 3 - "AppState.tsx"
Cohesion: 0.07
Nodes (34): blankEvent(), CalendarPage(), days, monday(), reminderValue(), SyncStatus, weekDays(), CaptureInbox() (+26 more)

### Community 4 - "auth.mjs"
Cohesion: 0.15
Nodes (30): POST(), GET(), POST(), auditSecurity(), authenticate(), base32(), beginTotpEnrollment(), changePassword() (+22 more)

### Community 5 - "offlineQueue.ts"
Cohesion: 0.17
Nodes (23): PWARegister(), ServiceNotice(), metadata, viewport, announce(), database(), flushQueue(), listOfflineCaptures() (+15 more)

### Community 6 - "projects.mjs"
Cohesion: 0.15
Nodes (18): POST(), POST(), GET(), DELETE(), POST(), Link, ProjectsPage(), request() (+10 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 8 - "google-calendar.mjs"
Cohesion: 0.19
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), beginGoogleOAuth(), completeGoogleOAuth() (+12 more)

### Community 9 - "calendar-sync.mjs"
Cohesion: 0.22
Nodes (18): POST(), GET(), POST(), applyGoogleEvent(), calendarSyncStatus(), claimWrite(), dateInZone(), googlePayload() (+10 more)

### Community 10 - "config.mjs"
Cohesion: 0.16
Nodes (15): POST(), GET(), absolute(), ensureDataDirs(), root, execFileAsync, extractHandwriting(), extractText() (+7 more)

### Community 11 - "page.tsx"
Cohesion: 0.14
Nodes (17): AutomationBuilder(), Condition, Draft, notification(), Props, Step, Automation, AutomationsPage() (+9 more)

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

### Community 16 - "knowledge-graph.mjs"
Cohesion: 0.26
Nodes (11): GET(), GET(), clean(), edgeId(), href, knowledgePath(), nodeId(), queryKnowledgeGraph() (+3 more)

### Community 17 - "page.tsx"
Cohesion: 0.15
Nodes (11): Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons, Mfa, request(), sections (+3 more)

### Community 18 - "now"
Cohesion: 0.28
Nodes (12): POST(), PATCH(), advanceAutomationRun(), cancelAutomationRun(), completeAutomationSkillStep(), conditionMatches(), executeAutomation(), finishAutomationRun() (+4 more)

### Community 19 - "modules.mjs"
Cohesion: 0.31
Nodes (10): POST(), POST(), automationDefinition(), cronField(), normalizeStep(), previewAutomation(), readNotification(), stepLabel() (+2 more)

### Community 20 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 21 - "route.ts"
Cohesion: 0.33
Nodes (10): DELETE(), GET(), PATCH(), POST(), analyticsStatus(), deleteAnalytics(), recordAnalytics(), schemas (+2 more)

### Community 22 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

### Community 23 - "saveAssignment"
Cohesion: 0.25
Nodes (9): GET(), POST(), GET(), POST(), listAssignments(), listAutomations(), saveAssignment(), saveAutomation() (+1 more)

### Community 24 - "push.mjs"
Cohesion: 0.38
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 25 - "ModuleShell.tsx"
Cohesion: 0.22
Nodes (6): ModuleShell(), nav, Notification, Recommendation, SearchHit, shortcuts

### Community 26 - "page.tsx"
Cohesion: 0.29
Nodes (6): basic(), MarkdownContent(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 27 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 28 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 29 - "worker.mjs"
Cohesion: 0.33
Nodes (8): cronDue(), deliverDueReminders(), failAutomationSkillStep(), runScheduledAutomations(), optimizationSchema, runOne(), schema, startWorker()

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
Cohesion: 0.53
Nodes (3): GET(), automationMetrics(), automationRuns()

### Community 34 - "route.ts"
Cohesion: 0.47
Nodes (4): DELETE(), POST(), deletePushSubscription(), savePushSubscription()

### Community 35 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 36 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 37 - "route.ts"
Cohesion: 0.60
Nodes (4): GET(), POST(), noteOptimizations(), requestNoteOptimization()

### Community 38 - "saveCard"
Cohesion: 0.60
Nodes (4): GET(), POST(), dueCards(), saveCard()

### Community 39 - "saveCourse"
Cohesion: 0.60
Nodes (4): GET(), POST(), listCourses(), saveCourse()

### Community 40 - "saveQuiz"
Cohesion: 0.60
Nodes (4): GET(), POST(), listQuizzes(), saveQuiz()

### Community 41 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 44 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **150 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `CodingPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `StudyPage()` (2× useful, score=1.954494303)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `db.mjs` to `core.mjs`, `projects.mjs`, `google-calendar.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `knowledge-graph.mjs`, `objects.mjs`, `push.mjs`, `worker.mjs`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `loadConfig()` connect `core.mjs` to `config.mjs`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.056377449020391844 - nodes in this community are weakly interconnected._
- **Should `db.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08383838383838384 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `AppState.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07439024390243902 - nodes in this community are weakly interconnected._