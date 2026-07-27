# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 861 nodes · 1730 edges · 69 communities (53 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73ad9c76`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- json
- db.mjs
- scripts
- AppState.tsx
- auth.mjs
- offlineQueue.ts
- page.tsx
- projects.mjs
- compilerOptions
- google-calendar.mjs
- dashboards.mjs
- calendar-sync.mjs
- page.tsx
- approvals.mjs
- annotations.mjs
- jobs.mjs
- skills.mjs
- now
- knowledge-graph.mjs
- page.tsx
- modules.mjs
- compiler.mjs
- route.ts
- push.mjs
- recommendations.mjs
- page.tsx
- page.tsx
- ai.mjs
- search.mjs
- worker.mjs
- createNotification
- backend.test.js
- frontend.test.js
- route.ts
- route.ts
- saveAssignment
- page.tsx
- page.tsx
- saveAutomation
- saveCard
- saveCourse
- saveQuiz
- page.tsx
- TutorPanel.tsx
- page.tsx
- auth.spec.ts
- route.ts
- testAutomation
- readAllNotifications
- reviewCard
- submitQuiz
- page.tsx
- page.tsx
- playwright.config.ts
- codex.mjs
- 01-release.spec.ts
- next.config.ts
- next-env.d.ts
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
8. `getDatabase()` - 17 edges
9. `now()` - 16 edges
10. `compilerOptions` - 15 edges

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

## Communities (69 total, 16 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.06
Nodes (65): POST(), DELETE(), GET(), GET(), GET(), GET(), POST(), GET() (+57 more)

### Community 1 - "json"
Cohesion: 0.12
Nodes (43): POST(), GET(), POST(), POST(), DELETE(), DELETE(), GET(), POST() (+35 more)

### Community 2 - "db.mjs"
Cohesion: 0.08
Nodes (33): GET(), POST(), GET(), safe(), GET(), PATCH(), backup, ensureColumn() (+25 more)

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

### Community 7 - "page.tsx"
Cohesion: 0.10
Nodes (20): ModuleShell(), nav, Notification, Recommendation, SearchHit, Dashboard, DashboardsPage(), detail() (+12 more)

### Community 8 - "projects.mjs"
Cohesion: 0.15
Nodes (18): POST(), POST(), GET(), DELETE(), POST(), Link, ProjectsPage(), request() (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "google-calendar.mjs"
Cohesion: 0.19
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), beginGoogleOAuth(), completeGoogleOAuth() (+12 more)

### Community 11 - "dashboards.mjs"
Cohesion: 0.18
Nodes (18): DELETE(), GET(), POST(), POST(), GET(), POST(), dashboardView(), deleteDashboard() (+10 more)

### Community 12 - "calendar-sync.mjs"
Cohesion: 0.22
Nodes (18): POST(), GET(), POST(), applyGoogleEvent(), calendarSyncStatus(), claimWrite(), dateInZone(), googlePayload() (+10 more)

### Community 13 - "page.tsx"
Cohesion: 0.14
Nodes (17): AutomationBuilder(), Condition, Draft, notification(), Props, Step, Automation, AutomationsPage() (+9 more)

### Community 14 - "approvals.mjs"
Cohesion: 0.25
Nodes (13): POST(), GET(), POST(), POST(), actionHash(), approve(), canonical(), consumeApproval() (+5 more)

### Community 15 - "annotations.mjs"
Cohesion: 0.24
Nodes (13): DELETE(), PATCH(), GET(), GET(), POST(), deleteAnnotation(), exportAnnotations(), geometry() (+5 more)

### Community 16 - "jobs.mjs"
Cohesion: 0.28
Nodes (12): GET(), terminal, POST(), addJobEvent(), cancelJob(), claimJob(), enqueueJob(), failJob() (+4 more)

### Community 17 - "skills.mjs"
Cohesion: 0.22
Nodes (13): POST(), GET(), POST(), buildSkillPrompt(), definitions, getSkill(), insertTutorMessage(), loadTutorSession() (+5 more)

### Community 18 - "now"
Cohesion: 0.25
Nodes (13): POST(), PATCH(), advanceAutomationRun(), cancelAutomationRun(), completeAutomationSkillStep(), conditionMatches(), executeAutomation(), finishAutomationRun() (+5 more)

### Community 19 - "knowledge-graph.mjs"
Cohesion: 0.26
Nodes (11): GET(), GET(), clean(), edgeId(), href, knowledgePath(), nodeId(), queryKnowledgeGraph() (+3 more)

### Community 20 - "page.tsx"
Cohesion: 0.15
Nodes (11): Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons, Mfa, request(), sections (+3 more)

### Community 21 - "modules.mjs"
Cohesion: 0.31
Nodes (10): POST(), POST(), automationDefinition(), cronField(), normalizeStep(), previewAutomation(), readNotification(), stepLabel() (+2 more)

### Community 22 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 23 - "route.ts"
Cohesion: 0.33
Nodes (10): DELETE(), GET(), PATCH(), POST(), analyticsStatus(), deleteAnalytics(), recordAnalytics(), schemas (+2 more)

### Community 24 - "push.mjs"
Cohesion: 0.38
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 25 - "recommendations.mjs"
Cohesion: 0.44
Nodes (7): PATCH(), GET(), buildRecommendations(), decideRecommendation(), now(), recommendations(), view()

### Community 26 - "page.tsx"
Cohesion: 0.29
Nodes (6): basic(), MarkdownContent(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 27 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 28 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 29 - "search.mjs"
Cohesion: 0.36
Nodes (7): GET(), candidates(), cosine(), key(), searchWorkspace(), text, types

### Community 30 - "worker.mjs"
Cohesion: 0.33
Nodes (8): cronDue(), deliverDueReminders(), failAutomationSkillStep(), runScheduledAutomations(), optimizationSchema, runOne(), schema, startWorker()

### Community 31 - "createNotification"
Cohesion: 0.38
Nodes (4): GET(), POST(), createNotification(), listNotifications()

### Community 32 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 33 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 34 - "route.ts"
Cohesion: 0.53
Nodes (3): GET(), automationMetrics(), automationRuns()

### Community 35 - "route.ts"
Cohesion: 0.47
Nodes (4): DELETE(), POST(), deletePushSubscription(), savePushSubscription()

### Community 36 - "saveAssignment"
Cohesion: 0.47
Nodes (5): GET(), POST(), listAssignments(), saveAssignment(), version()

### Community 37 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 38 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 39 - "saveAutomation"
Cohesion: 0.60
Nodes (4): GET(), POST(), listAutomations(), saveAutomation()

### Community 40 - "saveCard"
Cohesion: 0.60
Nodes (4): GET(), POST(), dueCards(), saveCard()

### Community 41 - "saveCourse"
Cohesion: 0.60
Nodes (4): GET(), POST(), listCourses(), saveCourse()

### Community 42 - "saveQuiz"
Cohesion: 0.60
Nodes (4): GET(), POST(), listQuizzes(), saveQuiz()

### Community 43 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 46 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **159 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `CodingPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `StudyPage()` (2× useful, score=1.954494303)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `db.mjs` to `json`, `projects.mjs`, `google-calendar.mjs`, `dashboards.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `knowledge-graph.mjs`, `push.mjs`, `recommendations.mjs`, `worker.mjs`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `loadConfig()` connect `json` to `search.mjs`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06160506160506161 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.11794871794871795 - nodes in this community are weakly interconnected._
- **Should `db.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07678075855689177 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._