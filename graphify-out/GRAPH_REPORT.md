# Graph Report - Noema  (2026-08-03)

## Corpus Check
- 309 files · ~70,993 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1747 nodes · 4820 edges · 133 communities (109 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1fafbec6`
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
- id.ts
- next.config.ts
- next-env.d.ts
- @phosphor-icons/react
- web-push
- sw.js
- mjs.d.ts
- job-events.mjs
- automations.mjs
- push.mjs
- reminders.mjs
- index.mjs
- 16. Projects Module
- 19. Global Search
- 21. Notifications and Attention Management
- 28. Loading, Empty, and Error States
- 29. Security and Privacy Interface
- Q: Compare the current product with overallPRD.md: differences, missing capabilities, and recommended next steps
- Q: What remains before LifeOS is a working v1?
- Q: whats our progress currently
- Q: Why is ModuleShell() a high-betweenness cross-community bridge?
- Q: by using graphify when necessary, can you explain how this works? the vault, vault's contents, notes, management, the study, tasks, calendar, coding and how AI works in each of those elements?
- Q: how does the ai pipeline work during processing inbox?
- Q: explain it simpler and in detail. btw does it have inbox log? where does it save the inbox files before it gets processed?
- Q: which of these inputs of mine is done and which isnt done?
- Noema Project Memory
- Noema Project Memory
- _e2e-test.mjs
- 34. MVP Frontend Scope
- 3. Frontend Product Goals
- 8. Global Application Shell
- ACCEPTANCE.md
- README.md
- POST_V1.md
- SKILL.md
- SKILL.md
- SKILL.md
- SKILL.md
- SKILL.md
- SKILL.md
- README.md
- SKILL.md
- SKILL.md
- SKILL.md
- SKILL.md
- todo.md
- route.ts
- route.ts
- route.ts
- route.ts

## God Nodes (most connected - your core abstractions)
1. `handle()` - 319 edges
2. `json()` - 306 edges
3. `requireWorkspace()` - 209 edges
4. `body()` - 158 edges
5. `requireUser()` - 81 edges
6. `loadConfig()` - 56 edges
7. `getDatabase()` - 45 edges
8. `idempotent()` - 43 edges
9. `requireMfa()` - 42 edges
10. `createId()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `findFolder()` --indirect_call--> `folder()`  [INFERRED]
  app/components/VaultOrganizer.tsx → server/handwriting.mjs
- `DashboardsPage()` --indirect_call--> `widget()`  [INFERRED]
  app/dashboards/page.tsx → server/dashboards.mjs
- `ProjectsPage()` --indirect_call--> `project()`  [INFERRED]
  app/projects/page.tsx → server/projects.mjs
- `SettingsPage()` --indirect_call--> `analyticsStatus()`  [INFERRED]
  app/settings/page.tsx → server/analytics.mjs
- `GET()` --calls--> `handle()`  [EXTRACTED]
  app/api/v1/ai-agents/route.ts → server/http.mjs

## Import Cycles
- None detected.

## Communities (133 total, 24 thin omitted)

### Community 0 - "modules.mjs"
Cohesion: 0.08
Nodes (54): GET(), GET(), POST(), PATCH(), PATCH(), advanceAutomationRun(), automationDefinition(), automationMetrics() (+46 more)

### Community 1 - "loadConfig"
Cohesion: 0.22
Nodes (23): allowedPermissions, audit(), catalogEntries(), catalogId(), compatible(), contextFor(), copyPackage(), fail() (+15 more)

### Community 2 - "vault.mjs"
Cohesion: 0.11
Nodes (52): POST(), GET(), createHandwritingNote(), fail(), folder(), title(), atomicWrite(), connectVault() (+44 more)

### Community 3 - "collaboration.mjs"
Cohesion: 0.16
Nodes (28): POST(), GET(), DELETE(), PATCH(), GET(), POST(), acceptInvitation(), audit() (+20 more)

### Community 4 - "json"
Cohesion: 0.09
Nodes (20): POST(), GET(), POST(), POST(), PATCH(), GET(), POST(), POST() (+12 more)

### Community 5 - "core.mjs"
Cohesion: 0.06
Nodes (84): GET(), backup, absolute(), actorInfo(), applyCaptureAction(), applyCaptureInterpretation(), applyInverse(), applyNoteOptimization() (+76 more)

### Community 6 - "handle"
Cohesion: 0.09
Nodes (23): POST(), GET(), PATCH(), POST(), GET(), GET(), PATCH(), POST() (+15 more)

### Community 7 - "auth.mjs"
Cohesion: 0.09
Nodes (46): GET(), GET(), POST(), POST(), POST(), DELETE(), GET(), DELETE() (+38 more)

### Community 8 - "repositories.mjs"
Cohesion: 0.22
Nodes (20): GET(), POST(), GET(), PATCH(), allowed(), audit(), browseRepository(), commands (+12 more)

### Community 9 - "offlineQueue.ts"
Cohesion: 0.20
Nodes (25): PWARegister(), announce(), database(), deleteInkDraft(), flushQueue(), InkDraft, listOfflineCaptures(), listPending() (+17 more)

### Community 10 - "db.mjs"
Cohesion: 0.06
Nodes (43): POST(), POST(), GET(), terminal, GET(), GET(), db, root (+35 more)

### Community 11 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+17 more)

### Community 12 - "google-calendar.mjs"
Cohesion: 0.08
Nodes (51): DELETE(), GET(), PATCH(), POST(), POST(), GET(), POST(), GET() (+43 more)

### Community 13 - "projects.mjs"
Cohesion: 0.27
Nodes (16): GET(), actorInfo(), audit(), linkProject(), now(), project(), projectWorkspace(), saveBlocker() (+8 more)

### Community 14 - "dashboards.mjs"
Cohesion: 0.30
Nodes (11): dashboardView(), duplicateDashboard(), layout(), listDashboards(), reorderDashboards(), rowView(), saveDashboard(), text() (+3 more)

### Community 15 - "findOwned"
Cohesion: 0.05
Nodes (35): API surface, Architecture, Authentication and security, Capture pipeline, Codex runner, Data model, Decisions to confirm before implementation, Delivery slices (+27 more)

### Community 16 - "calendar-sync.mjs"
Cohesion: 0.08
Nodes (23): 1. Product Overview, 20. Command Palette, 22. Activity and Audit History, 26. Keyboard and Power-User Interaction, 27. Accessibility Requirements, 2. Product Vision, 30.1 AI behavior settings, 30.2 Data portability (+15 more)

### Community 17 - "page.tsx"
Cohesion: 0.14
Nodes (17): AutomationBuilder(), Condition, Draft, notification(), Props, Step, Automation, AutomationsPage() (+9 more)

### Community 18 - "page.tsx"
Cohesion: 0.11
Nodes (16): Agent, AIAgentSettings(), providers, LifeOSMigration(), Analytics, CalendarSync, GoogleCalendar, GoogleConnection (+8 more)

### Community 19 - "dependencies"
Cohesion: 0.11
Nodes (19): katex, next, dependencies, katex, next, react, react-dom, react-markdown (+11 more)

### Community 20 - "interpret-capture.mjs"
Cohesion: 0.06
Nodes (68): POST(), POST(), configuredChain(), geminiSchema(), isCapacityError(), isTransientAIError(), parseJSON(), presets (+60 more)

### Community 21 - "InkEditor.tsx"
Cohesion: 0.19
Nodes (19): Source, InkEditor(), Props, acceptInkPointer(), eraseAt(), fitInkView(), inkPoint, InkStroke (+11 more)

### Community 22 - "approvals.mjs"
Cohesion: 0.23
Nodes (16): POST(), GET(), POST(), DELETE(), PATCH(), POST(), actionHash(), approve() (+8 more)

### Community 23 - "annotations.mjs"
Cohesion: 0.35
Nodes (9): GET(), deleteAnnotation(), exportAnnotations(), geometry(), listAnnotations(), now(), parse(), saveAnnotation() (+1 more)

### Community 24 - "jobs.mjs"
Cohesion: 0.10
Nodes (21): GET(), POST(), POST(), DELETE(), GET(), POST(), GET(), GET() (+13 more)

### Community 25 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, backup, build, dev, import:v1, lint, start, sync:obsidian (+9 more)

### Community 26 - "skills.mjs"
Cohesion: 0.17
Nodes (18): GET(), safe(), POST(), GET(), GET(), GET(), POST(), absolute() (+10 more)

### Community 27 - "AppState.tsx"
Cohesion: 0.07
Nodes (36): Annotation, blankEvent(), CalendarPage(), days, monday(), positionFor(), reminderValue(), SyncStatus (+28 more)

### Community 28 - "ai-agents.mjs"
Cohesion: 0.09
Nodes (19): DELETE(), PATCH(), GET(), POST(), DELETE(), POST(), GET(), GET() (+11 more)

### Community 29 - "ModuleShell.tsx"
Cohesion: 0.05
Nodes (34): AuditEvent, icons, time, InfiniteCanvas, Approval, Repository, Entry, Git (+26 more)

### Community 30 - "page.tsx"
Cohesion: 0.13
Nodes (13): buildFileTree(), CompilerPage(), FileNode, Language, LazySyntaxPreview, Result, SavedFile, starters (+5 more)

### Community 31 - "devDependencies"
Cohesion: 0.13
Nodes (15): @axe-core/playwright, devDependencies, @axe-core/playwright, @playwright/test, @types/node, @types/react, @types/react-dom, @types/tar-stream (+7 more)

### Community 32 - "ai.mjs"
Cohesion: 0.18
Nodes (11): 6.10 Notification, 6.1 Capture, 6.2 Note, 6.3 Task, 6.4 Event, 6.5 Project, 6.6 Document, 6.7 Person (+3 more)

### Community 33 - "knowledge-graph.mjs"
Cohesion: 0.30
Nodes (10): GET(), clean(), edgeId(), href, knowledgePath(), nodeId(), queryKnowledgeGraph(), syncKnowledgeGraph() (+2 more)

### Community 34 - "push.mjs"
Cohesion: 0.28
Nodes (6): GET(), GET(), GET(), POST(), listNotifications(), listDeliveries()

### Community 35 - "page.tsx"
Cohesion: 0.21
Nodes (10): CaptureInbox(), CaptureRow(), Filter, filters, matches(), sourceMeta, statusMeta, timeFor() (+2 more)

### Community 36 - "page.tsx"
Cohesion: 0.46
Nodes (7): Task, blankTask(), dateTimeValue(), dateValue(), jakartaIso(), jakartaParts(), TasksPage()

### Community 37 - "manifest.json"
Cohesion: 0.15
Nodes (12): notifications:write, tasks:read, apiVersion, description, entry, id, integrity, name (+4 more)

### Community 38 - "route.ts"
Cohesion: 0.26
Nodes (14): GET(), PUT(), GET(), extensions, ignored, language(), languages, listCodeFiles() (+6 more)

### Community 39 - "objects.mjs"
Cohesion: 0.18
Nodes (11): 9.1 Capture entry points, 9.2 Capture composer, 9.3 Capture modes, 9.4 AI interpretation preview, 9.5 Confidence handling, 9.6 Processing states, 9.7 Capture inbox, 9. Universal Capture Experience (+3 more)

### Community 40 - "recommendations.mjs"
Cohesion: 0.08
Nodes (26): POST(), POST(), POST(), DELETE(), PATCH(), DELETE(), PATCH(), POST() (+18 more)

### Community 41 - "page.tsx"
Cohesion: 0.25
Nodes (13): DELETE(), GET(), POST(), deleteAIAgent(), key(), listAIAgents(), open(), profiles (+5 more)

### Community 42 - "page.tsx"
Cohesion: 0.24
Nodes (9): Assignment, Card, Course, post(), Question, Quiz, request(), StudyPage() (+1 more)

### Community 43 - "search.mjs"
Cohesion: 0.18
Nodes (10): Accessibility & Inclusion, Anti-references, Brand Personality, Design Principles, Platform, Positioning, Product, Product Purpose (+2 more)

### Community 44 - "VaultOrganizer.tsx"
Cohesion: 0.10
Nodes (23): Note, useAppState(), Action, actions, MarkdownToolbar(), Block, MarkdownBlock(), NoteAttachmentButton() (+15 more)

### Community 45 - "page.tsx"
Cohesion: 0.11
Nodes (16): HandwritingCapture(), ModalDialog(), NavigationWarmup(), routes, ServiceNotice(), showUnavailable(), metadata, viewport (+8 more)

### Community 46 - "page.tsx"
Cohesion: 0.26
Nodes (12): POST(), GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo() (+4 more)

### Community 47 - "worker.mjs"
Cohesion: 0.20
Nodes (9): 1 — Mobile repository IDE, 2 — Advanced automation builder, 3 — Knowledge-graph visualization, 4 — Plugin marketplace, 5 — Custom dashboard builder, 6 — Multiplayer collaboration, 7 — Financial execution controls, 8 — Release and operations (+1 more)

### Community 48 - "page.tsx"
Cohesion: 0.33
Nodes (5): 1. Token Conservation & Conciseness (`honey`), 2. UI/UX Quality & Aesthetics (`impeccable`), 3. Code Quality & Codebase Architecture (`graphify`), 4. Skill Activation, Persistent Engineering & Design Directives

### Community 49 - "sync-obsidian.mjs"
Cohesion: 0.13
Nodes (14): Already present, Approval gate, Architecture decisions, Current state, Goal, Implementation Plan: Today Handwriting and Compiler Rework, Not complete, Phase 1: Establish a working baseline (+6 more)

### Community 50 - "layout.tsx"
Cohesion: 0.22
Nodes (9): 10.1 Desktop layout, 10.2 Mobile layout, 10.3 Daily summary, 10.4 Empty state, 10. Today Page, Attention panel, Header, Main timeline (+1 more)

### Community 51 - "page.tsx"
Cohesion: 0.33
Nodes (6): colors, Edge, Graph, GraphPage(), Node, request()

### Community 52 - "retrieveSkillContext"
Cohesion: 0.25
Nodes (7): Color, Direction, Layout, Motion, Noema Design System, Shape and Depth, Typography

### Community 53 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,statSync,symlinkSync,writeFileSync}, {join}, test, {tmpdir}

### Community 54 - "frontend.test.js"
Cohesion: 0.25
Nodes (5): assert, fs, path, root, test

### Community 55 - "page.tsx"
Cohesion: 0.33
Nodes (5): 1. Token Conservation & Conciseness (`honey`), 2. UI/UX Quality & Aesthetics (`impeccable`), 3. Code Quality & Codebase Architecture (`graphify`), 4. Skill Activation, Persistent Engineering & Design Directives

### Community 56 - "optimize-note.mjs"
Cohesion: 0.25
Nodes (8): 11.1 Calendar views, 11.2 Event creation, 11.3 Event card content, 11.4 Event detail, 11.5 Event preparation, 11.6 Calendar conflict handling, 11.7 External calendar synchronization, 11. Calendar Module

### Community 57 - "page.tsx"
Cohesion: 0.50
Nodes (4): DELETE(), GET(), POST(), deletePushSubscription()

### Community 58 - "createFileCapture"
Cohesion: 0.25
Nodes (8): 13.1 Vault views, 13.2 Note list, 13.3 Note editor, 13.4 Editor modes, 13.5 Note properties, 13.6 Backlinks and relationships, 13.7 AI note actions, 13. Vault Module

### Community 59 - "route.ts"
Cohesion: 0.25
Nodes (8): 24.1 Visual direction, 24.2 Color system, 24.3 Typography, 24.4 Spacing, 24.5 Border radius, 24.6 Iconography, 24.7 Motion, 24. Design System

### Community 60 - "page.tsx"
Cohesion: 0.25
Nodes (8): 31.1 Application framework, 31.2 Styling, 31.3 State management, 31.4 Editor, 31.5 Calendar, 31.6 Canvas, 31.7 Coding editor, 31. Frontend Technical Recommendations

### Community 61 - "page.tsx"
Cohesion: 0.25
Nodes (8): 5.1 Capture first, 5.2 AI must remain visible, 5.3 Everything must be reversible, 5.4 Original sources must be preserved, 5.5 One system, multiple views, 5.6 Progressive disclosure, 5.7 AI should reduce effort, not remove control, 5. Product Principles

### Community 62 - "vault-task-writeback.mjs"
Cohesion: 0.29
Nodes (7): 12.1 Task views, 12.2 Task list behavior, 12.3 Task card, 12.4 Task detail, 12.5 Task statuses, 12.6 Natural-language task editing, 12. Task Module

### Community 63 - "01-release.spec.ts"
Cohesion: 0.50
Nodes (3): routes, totp(), verifyRecentMfa()

### Community 64 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 65 - "auth.spec.ts"
Cohesion: 0.83
Nodes (3): loginWithTotp(), passwordStep(), totp()

### Community 66 - "route.ts"
Cohesion: 0.29
Nodes (7): 14.1 Study dashboard, 14.2 Course workspace, 14.3 Lecture capture flow, 14.4 Source comparison view, 14.5 Review workflow, 14.6 Assignment workspace, 14. Study Module

### Community 67 - "page.tsx"
Cohesion: 0.29
Nodes (7): 18.1 Automation dashboard, 18.2 Automation card, 18.3 Automation detail, 18.4 Example: AI video pipeline, 18.5 Example: outreach pipeline, 18.6 High-risk automations, 18. Automations Module

### Community 69 - "codex.mjs"
Cohesion: 0.29
Nodes (7): 38. Recommended Initial Screen-Building Order, Stage 1: Foundation, Stage 2: Core daily experience, Stage 3: Action management, Stage 4: Knowledge management, Stage 5: Study workflows, Stage 6: Extended modules

### Community 70 - "migrate.mjs"
Cohesion: 0.33
Nodes (6): 15.1 Canvas functionality, 15.2 Mathematical input, 15.3 AI canvas actions, 15.4 Source preservation, 15.5 MVP treatment, 15. Canvas and Handwriting Module

### Community 73 - "id.ts"
Cohesion: 0.33
Nodes (6): 17.1 Coding dashboard, 17.2 Repository workspace, 17.3 Mobile coding experience, 17.4 Agent action review, 17.5 Session status, 17. Coding Module

### Community 83 - "job-events.mjs"
Cohesion: 0.33
Nodes (6): 23.1 AI presentation, 23.2 AI side panel, 23.3 Tool transparency, 23.4 AI-generated content indicators, 23.5 AI error correction, 23. AI Interaction Design

### Community 84 - "automations.mjs"
Cohesion: 0.33
Nodes (6): 25.1 Breakpoint philosophy, 25.2 Mobile priorities, 25.3 Desktop priorities, 25.4 Touch targets, 25.5 Safe areas, 25. Responsive Design

### Community 85 - "push.mjs"
Cohesion: 0.33
Nodes (6): 7.1 Primary navigation, 7.2 Navigation behavior, 7.3 Global top bar, 7. Information Architecture, Desktop, Mobile

### Community 86 - "reminders.mjs"
Cohesion: 0.33
Nodes (5): assert, {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync}, {join,resolve}, test, {tmpdir}

### Community 92 - "16. Projects Module"
Cohesion: 0.40
Nodes (5): 16.1 Project dashboard, 16.2 Project overview, 16.3 Project statuses, 16.4 Project templates, 16. Projects Module

### Community 93 - "19. Global Search"
Cohesion: 0.40
Nodes (5): 19.1 Search scope, 19.2 Search behavior, 19.3 Search result design, 19.4 Natural-language search, 19. Global Search

### Community 94 - "21. Notifications and Attention Management"
Cohesion: 0.40
Nodes (5): 21.1 Notification types, 21.2 Notification severity, 21.3 Notification center, 21.4 Avoiding notification overload, 21. Notifications and Attention Management

### Community 95 - "28. Loading, Empty, and Error States"
Cohesion: 0.40
Nodes (5): 28.1 Skeleton loading, 28.2 Optimistic updates, 28.3 Partial processing, 28.4 Offline capture, 28. Loading, Empty, and Error States

### Community 96 - "29. Security and Privacy Interface"
Cohesion: 0.40
Nodes (5): 29.1 Session management, 29.2 Agent permissions, 29.3 Sensitive actions, 29.4 Audit access, 29. Security and Privacy Interface

### Community 97 - "Q: Compare the current product with overallPRD.md: differences, missing capabilities, and recommended next steps"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Compare the current product with overallPRD.md: differences, missing capabilities, and recommended next steps, Source Nodes

### Community 98 - "Q: What remains before LifeOS is a working v1?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: What remains before LifeOS is a working v1?, Source Nodes

### Community 99 - "Q: whats our progress currently"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: whats our progress currently, Source Nodes

### Community 100 - "Q: Why is ModuleShell() a high-betweenness cross-community bridge?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why is ModuleShell() a high-betweenness cross-community bridge?, Source Nodes

### Community 101 - "Q: by using graphify when necessary, can you explain how this works? the vault, vault's contents, notes, management, the study, tasks, calendar, coding and how AI works in each of those elements?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: by using graphify when necessary, can you explain how this works? the vault, vault's contents, notes, management, the study, tasks, calendar, coding and how AI works in each of those elements?, Source Nodes

### Community 102 - "Q: how does the ai pipeline work during processing inbox?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: how does the ai pipeline work during processing inbox?, Source Nodes

### Community 103 - "Q: explain it simpler and in detail. btw does it have inbox log? where does it save the inbox files before it gets processed?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: explain it simpler and in detail. btw does it have inbox log? where does it save the inbox files before it gets processed?, Source Nodes

### Community 104 - "Q: which of these inputs of mine is done and which isnt done?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: which of these inputs of mine is done and which isnt done?, Source Nodes

### Community 105 - "Noema Project Memory"
Cohesion: 0.40
Nodes (4): Commands and gotchas, Implementation decisions, Noema Project Memory, Product and design

### Community 106 - "Noema Project Memory"
Cohesion: 0.40
Nodes (4): Commands and gotchas, Implementation decisions, Noema Project Memory, Product and design

### Community 107 - "_e2e-test.mjs"
Cohesion: 0.67
Nodes (3): go(), log(), out

### Community 108 - "34. MVP Frontend Scope"
Cohesion: 0.50
Nodes (4): 34. MVP Frontend Scope, Deferred, Required, Simplified for MVP

### Community 109 - "3. Frontend Product Goals"
Cohesion: 0.50
Nodes (4): 3.1 Primary goals, 3.2 Secondary goals, 3.3 Non-goals for the first frontend version, 3. Frontend Product Goals

### Community 110 - "8. Global Application Shell"
Cohesion: 0.50
Nodes (4): 8.1 Layout regions, 8.2 Inspector drawer, 8.3 Context preservation, 8. Global Application Shell

### Community 128 - "route.ts"
Cohesion: 0.67
Nodes (3): GET(), POST(), listAutomations()

### Community 129 - "route.ts"
Cohesion: 0.67
Nodes (3): GET(), POST(), listAssignments()

### Community 130 - "route.ts"
Cohesion: 0.67
Nodes (3): GET(), POST(), listCourses()

## Knowledge Gaps
- **527 isolated node(s):** `out`, `AuditEvent`, `icons`, `time`, `terminal` (+522 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `ModuleShell.tsx` (2× useful, score=1.738022303)
- `AutomationsPage()` (2× useful, score=1.70527945) _(code changed — re-verify)_
- `CodingPage()` (2× useful, score=1.70527945)
- `StudyPage()` (2× useful, score=1.70527945) _(code changed — re-verify)_

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handle()` connect `jobs.mjs` to `modules.mjs`, `route.ts`, `vault.mjs`, `route.ts`, `json`, `core.mjs`, `handle`, `auth.mjs`, `repositories.mjs`, `route.ts`, `db.mjs`, `route.ts`, `google-calendar.mjs`, `projects.mjs`, `collaboration.mjs`, `interpret-capture.mjs`, `approvals.mjs`, `annotations.mjs`, `skills.mjs`, `ai-agents.mjs`, `knowledge-graph.mjs`, `push.mjs`, `route.ts`, `recommendations.mjs`, `page.tsx`, `page.tsx`, `page.tsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `DashboardsPage()` connect `ModuleShell.tsx` to `AppState.tsx`, `dashboards.mjs`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `widget()` connect `dashboards.mjs` to `ModuleShell.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `out`, `AuditEvent`, `icons` to the rest of the system?**
  _527 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08125 - nodes in this community are weakly interconnected._
- **Should `vault.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11163062536528345 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.08712121212121213 - nodes in this community are weakly interconnected._