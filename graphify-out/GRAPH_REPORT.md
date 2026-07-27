# Graph Report - .  (2026-07-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1014 nodes · 2079 edges · 76 communities (60 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9505976`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- json
- db.mjs
- collaboration.mjs
- plugins.mjs
- scripts
- ModuleShell.tsx
- AppState.tsx
- auth.mjs
- repositories.mjs
- offlineQueue.ts
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
- manifest.json
- objects.mjs
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
1. `json()` - 44 edges
2. `handle()` - 43 edges
3. `requireUser()` - 37 edges
4. `loadConfig()` - 22 edges
5. `getDatabase()` - 21 edges
6. `stamp()` - 20 edges
7. `now()` - 20 edges
8. `body()` - 19 edges
9. `idempotent()` - 17 edges
10. `now()` - 16 edges

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

## Communities (76 total, 16 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.06
Nodes (65): POST(), DELETE(), GET(), GET(), GET(), GET(), POST(), GET() (+57 more)

### Community 1 - "json"
Cohesion: 0.15
Nodes (35): POST(), GET(), POST(), POST(), DELETE(), DELETE(), GET(), POST() (+27 more)

### Community 2 - "db.mjs"
Cohesion: 0.08
Nodes (35): DELETE(), GET(), PATCH(), POST(), GET(), safe(), GET(), PATCH() (+27 more)

### Community 3 - "collaboration.mjs"
Cohesion: 0.11
Nodes (35): POST(), POST(), GET(), POST(), GET(), DELETE(), POST(), PATCH() (+27 more)

### Community 4 - "plugins.mjs"
Cohesion: 0.11
Nodes (37): POST(), DELETE(), PATCH(), POST(), GET(), GET(), POST(), absolute() (+29 more)

### Community 5 - "scripts"
Cohesion: 0.05
Nodes (43): @axe-core/playwright, next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream (+35 more)

### Community 6 - "ModuleShell.tsx"
Cohesion: 0.06
Nodes (31): Conflict, Detail, Invitation, Member, Presence, Workspace, ModuleShell(), nav (+23 more)

### Community 7 - "AppState.tsx"
Cohesion: 0.07
Nodes (34): blankEvent(), CalendarPage(), days, monday(), reminderValue(), SyncStatus, weekDays(), CaptureInbox() (+26 more)

### Community 8 - "auth.mjs"
Cohesion: 0.15
Nodes (30): POST(), GET(), POST(), auditSecurity(), authenticate(), base32(), beginTotpEnrollment(), changePassword() (+22 more)

### Community 9 - "repositories.mjs"
Cohesion: 0.17
Nodes (24): POST(), GET(), POST(), GET(), PATCH(), GET(), POST(), allowed() (+16 more)

### Community 10 - "offlineQueue.ts"
Cohesion: 0.17
Nodes (23): PWARegister(), ServiceNotice(), metadata, viewport, announce(), database(), flushQueue(), listOfflineCaptures() (+15 more)

### Community 11 - "projects.mjs"
Cohesion: 0.15
Nodes (18): POST(), POST(), GET(), DELETE(), POST(), Link, ProjectsPage(), request() (+10 more)

### Community 12 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 13 - "google-calendar.mjs"
Cohesion: 0.19
Nodes (20): GET(), PUT(), GET(), POST(), DELETE(), GET(), beginGoogleOAuth(), completeGoogleOAuth() (+12 more)

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

### Community 27 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

### Community 28 - "push.mjs"
Cohesion: 0.38
Nodes (8): PATCH(), GET(), claimDelivery(), deliverOne(), listDeliveries(), now(), resolveDelivery(), retryDelivery()

### Community 29 - "recommendations.mjs"
Cohesion: 0.44
Nodes (7): PATCH(), GET(), buildRecommendations(), decideRecommendation(), now(), recommendations(), view()

### Community 30 - "page.tsx"
Cohesion: 0.29
Nodes (6): basic(), MarkdownContent(), blankNote(), Optimization, renderMarkdown(), VaultPage()

### Community 31 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 32 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 33 - "search.mjs"
Cohesion: 0.36
Nodes (7): GET(), candidates(), cosine(), key(), searchWorkspace(), text, types

### Community 34 - "worker.mjs"
Cohesion: 0.33
Nodes (8): cronDue(), deliverDueReminders(), failAutomationSkillStep(), runScheduledAutomations(), optimizationSchema, runOne(), schema, startWorker()

### Community 35 - "createNotification"
Cohesion: 0.38
Nodes (4): GET(), POST(), createNotification(), listNotifications()

### Community 36 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 37 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 38 - "route.ts"
Cohesion: 0.53
Nodes (3): GET(), automationMetrics(), automationRuns()

### Community 39 - "route.ts"
Cohesion: 0.47
Nodes (4): DELETE(), POST(), deletePushSubscription(), savePushSubscription()

### Community 40 - "saveAssignment"
Cohesion: 0.47
Nodes (5): GET(), POST(), listAssignments(), saveAssignment(), version()

### Community 41 - "page.tsx"
Cohesion: 0.33
Nodes (4): Approval, Language, Result, starters

### Community 42 - "page.tsx"
Cohesion: 0.33
Nodes (4): Entry, Git, OpenFile, Repo

### Community 43 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 44 - "saveAutomation"
Cohesion: 0.60
Nodes (4): GET(), POST(), listAutomations(), saveAutomation()

### Community 45 - "saveCard"
Cohesion: 0.60
Nodes (4): GET(), POST(), dueCards(), saveCard()

### Community 46 - "saveCourse"
Cohesion: 0.60
Nodes (4): GET(), POST(), listCourses(), saveCourse()

### Community 47 - "saveQuiz"
Cohesion: 0.60
Nodes (4): GET(), POST(), listQuizzes(), saveQuiz()

### Community 48 - "page.tsx"
Cohesion: 0.50
Nodes (4): Delivery, href(), Notice, NotificationsPage()

### Community 49 - "01-release.spec.ts"
Cohesion: 0.50
Nodes (3): routes, totp(), verifyRecentMfa()

### Community 53 - "auth.spec.ts"
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

- **Why does `getDatabase()` connect `db.mjs` to `json`, `worker.mjs`, `collaboration.mjs`, `plugins.mjs`, `repositories.mjs`, `projects.mjs`, `google-calendar.mjs`, `dashboards.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `knowledge-graph.mjs`, `objects.mjs`, `push.mjs`, `recommendations.mjs`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `loadConfig()` connect `json` to `repositories.mjs`, `plugins.mjs`, `search.mjs`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06160506160506161 - nodes in this community are weakly interconnected._
- **Should `db.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.0786308973172988 - nodes in this community are weakly interconnected._
- **Should `collaboration.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11378353376503238 - nodes in this community are weakly interconnected._
- **Should `plugins.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.10808080808080808 - nodes in this community are weakly interconnected._