# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1020 nodes · 2293 edges · 73 communities (57 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba5961f1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- handle
- core.mjs
- db.mjs
- plugins.mjs
- collaboration.mjs
- scripts
- AppState.tsx
- auth.mjs
- ModuleShell.tsx
- repositories.mjs
- offlineQueue.ts
- compilerOptions
- google-calendar.mjs
- projects.mjs
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
- manifest.json
- push.mjs
- page.tsx
- page.tsx
- ai.mjs
- worker.mjs
- page.tsx
- createNotification
- backend.test.js
- frontend.test.js
- route.ts
- route.ts
- saveAssignment
- page.tsx
- page.tsx
- page.tsx
- saveAutomation
- saveCard
- saveCourse
- saveQuiz
- page.tsx
- 01-release.spec.ts
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
5. `getDatabase()` - 22 edges
6. `findOwned()` - 21 edges
7. `idempotent()` - 21 edges
8. `now()` - 20 edges
9. `loadConfig()` - 20 edges
10. `stamp()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs
- `GET()` --calls--> `getJob()`  [EXTRACTED]
  app/api/v1/jobs/[id]/route.ts → server/jobs.mjs
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs
- `POST()` --calls--> `getSkill()`  [EXTRACTED]
  app/api/v1/skills/[name]/run/route.ts → server/skills.mjs
- `POST()` --calls--> `executeAutomation()`  [EXTRACTED]
  app/api/v1/automations/[id]/runs/route.ts → server/modules.mjs

## Import Cycles
- None detected.

## Communities (73 total, 16 thin omitted)

### Community 0 - "handle"
Cohesion: 0.09
Nodes (55): POST(), POST(), GET(), POST(), POST(), DELETE(), DELETE(), GET() (+47 more)

### Community 1 - "core.mjs"
Cohesion: 0.10
Nodes (60): GET(), absolute(), actorInfo(), applyCaptureInterpretation(), applyInverse(), applyNoteOptimization(), audit(), backlinksForNote() (+52 more)

### Community 2 - "db.mjs"
Cohesion: 0.07
Nodes (42): DELETE(), GET(), PATCH(), POST(), GET(), safe(), PATCH(), GET() (+34 more)

### Community 3 - "plugins.mjs"
Cohesion: 0.09
Nodes (45): POST(), DELETE(), PATCH(), POST(), GET(), GET(), POST(), GET() (+37 more)

### Community 4 - "collaboration.mjs"
Cohesion: 0.11
Nodes (35): POST(), POST(), GET(), POST(), GET(), DELETE(), POST(), PATCH() (+27 more)

### Community 5 - "scripts"
Cohesion: 0.05
Nodes (43): @axe-core/playwright, next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream (+35 more)

### Community 6 - "AppState.tsx"
Cohesion: 0.07
Nodes (34): blankEvent(), CalendarPage(), days, monday(), reminderValue(), SyncStatus, weekDays(), CaptureInbox() (+26 more)

### Community 7 - "auth.mjs"
Cohesion: 0.14
Nodes (32): POST(), GET(), POST(), POST(), auditSecurity(), authenticate(), base32(), beginTotpEnrollment() (+24 more)

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

### Community 17 - "approvals.mjs"
Cohesion: 0.25
Nodes (13): POST(), GET(), POST(), POST(), actionHash(), approve(), canonical(), consumeApproval() (+5 more)

### Community 18 - "annotations.mjs"
Cohesion: 0.24
Nodes (13): DELETE(), PATCH(), GET(), GET(), POST(), deleteAnnotation(), exportAnnotations(), geometry() (+5 more)

### Community 19 - "jobs.mjs"
Cohesion: 0.28
Nodes (12): GET(), terminal, POST(), addJobEvent(), cancelJob(), claimJob(), enqueueJob(), failJob() (+4 more)

### Community 20 - "skills.mjs"
Cohesion: 0.22
Nodes (13): POST(), GET(), POST(), buildSkillPrompt(), definitions, getSkill(), insertTutorMessage(), loadTutorSession() (+5 more)

### Community 21 - "now"
Cohesion: 0.25
Nodes (13): POST(), PATCH(), advanceAutomationRun(), cancelAutomationRun(), completeAutomationSkillStep(), conditionMatches(), executeAutomation(), finishAutomationRun() (+5 more)

### Community 22 - "knowledge-graph.mjs"
Cohesion: 0.26
Nodes (11): GET(), GET(), clean(), edgeId(), href, knowledgePath(), nodeId(), queryKnowledgeGraph() (+3 more)

### Community 23 - "page.tsx"
Cohesion: 0.15
Nodes (11): Analytics, CalendarSync, GoogleCalendar, GoogleConnection, icons, Mfa, request(), sections (+3 more)

### Community 24 - "modules.mjs"
Cohesion: 0.31
Nodes (10): POST(), POST(), automationDefinition(), cronField(), normalizeStep(), previewAutomation(), readNotification(), stepLabel() (+2 more)

### Community 25 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 26 - "manifest.json"
Cohesion: 0.15
Nodes (12): notifications:write, tasks:read, apiVersion, description, entry, id, integrity, lifeos (+4 more)

### Community 27 - "push.mjs"
Cohesion: 0.38
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 28 - "page.tsx"
Cohesion: 0.29
Nodes (6): basic(), MarkdownContent(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 29 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 30 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 31 - "worker.mjs"
Cohesion: 0.33
Nodes (8): cronDue(), deliverDueReminders(), failAutomationSkillStep(), runScheduledAutomations(), optimizationSchema, runOne(), schema, startWorker()

### Community 32 - "page.tsx"
Cohesion: 0.25
Nodes (6): Conflict, Detail, Invitation, Member, Presence, Workspace

### Community 33 - "createNotification"
Cohesion: 0.38
Nodes (4): GET(), POST(), createNotification(), listNotifications()

### Community 34 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 35 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 36 - "route.ts"
Cohesion: 0.53
Nodes (3): GET(), automationMetrics(), automationRuns()

### Community 37 - "route.ts"
Cohesion: 0.47
Nodes (4): DELETE(), POST(), deletePushSubscription(), savePushSubscription()

### Community 38 - "saveAssignment"
Cohesion: 0.47
Nodes (5): GET(), POST(), listAssignments(), saveAssignment(), version()

### Community 39 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 40 - "page.tsx"
Cohesion: 0.33
Nodes (4): Entry, Git, OpenFile, Repo

### Community 41 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 42 - "saveAutomation"
Cohesion: 0.60
Nodes (4): GET(), POST(), listAutomations(), saveAutomation()

### Community 43 - "saveCard"
Cohesion: 0.60
Nodes (4): GET(), POST(), dueCards(), saveCard()

### Community 44 - "saveCourse"
Cohesion: 0.60
Nodes (4): GET(), POST(), listCourses(), saveCourse()

### Community 45 - "saveQuiz"
Cohesion: 0.60
Nodes (4): GET(), POST(), listQuizzes(), saveQuiz()

### Community 46 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 47 - "01-release.spec.ts"
Cohesion: 0.50
Nodes (3): routes, totp(), verifyRecentMfa()

### Community 51 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

## Knowledge Gaps
- **189 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `AutomationsPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `CodingPage()` (2× useful, score=1.954494303) _(code changed — re-verify)_
- `StudyPage()` (2× useful, score=1.954494303)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `db.mjs` to `handle`, `core.mjs`, `plugins.mjs`, `collaboration.mjs`, `repositories.mjs`, `google-calendar.mjs`, `projects.mjs`, `dashboards.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `knowledge-graph.mjs`, `push.mjs`, `worker.mjs`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `handle()` connect `handle` to `core.mjs`, `auth.mjs`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `json()` connect `handle` to `core.mjs`, `auth.mjs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `handle` be split into smaller, more focused modules?**
  _Cohesion score 0.09363295880149813 - nodes in this community are weakly interconnected._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09831029185867896 - nodes in this community are weakly interconnected._
- **Should `db.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06704260651629072 - nodes in this community are weakly interconnected._