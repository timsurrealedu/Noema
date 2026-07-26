# Graph Report - .  (2026-07-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 489 nodes · 999 edges · 31 communities (23 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2cf7151`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- core.mjs
- modules.mjs
- page.tsx
- AppState.tsx
- scripts
- db.mjs
- compilerOptions
- skills.mjs
- auth.mjs
- ops.mjs
- compiler.mjs
- backend.test.js
- frontend.test.js
- page.tsx
- page.tsx
- TutorPanel.tsx
- page.tsx
- page.tsx
- codex.mjs
- next.config.ts
- next-env.d.ts
- sw.js
- mjs.d.ts

## God Nodes (most connected - your core abstractions)
1. `json()` - 44 edges
2. `handle()` - 43 edges
3. `requireUser()` - 38 edges
4. `body()` - 20 edges
5. `idempotent()` - 17 edges
6. `compilerOptions` - 15 edges
7. `now()` - 14 edges
8. `stamp()` - 13 edges
9. `audit()` - 13 edges
10. `loadConfig()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `AppStateProvider()` --indirect_call--> `text()`  [INFERRED]
  app/components/AppState.tsx → server/modules.mjs
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs
- `GET()` --calls--> `listState()`  [EXTRACTED]
  app/api/v1/state/route.ts → server/core.mjs
- `POST()` --calls--> `undoAuditEvent()`  [EXTRACTED]
  app/api/v1/audit/[id]/undo/route.ts → server/core.mjs
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs

## Import Cycles
- None detected.

## Communities (31 total, 8 thin omitted)

### Community 0 - "json"
Cohesion: 0.12
Nodes (40): POST(), GET(), POST(), POST(), DELETE(), POST(), POST(), PATCH() (+32 more)

### Community 1 - "core.mjs"
Cohesion: 0.08
Nodes (50): POST(), GET(), GET(), GET(), GET(), POST(), POST(), GET() (+42 more)

### Community 2 - "modules.mjs"
Cohesion: 0.08
Nodes (46): GET(), POST(), GET(), POST(), POST(), GET(), POST(), POST() (+38 more)

### Community 3 - "page.tsx"
Cohesion: 0.07
Nodes (26): Automation, AutomationsPage(), empty, Metrics, request(), Run, when(), CaptureInbox() (+18 more)

### Community 4 - "AppState.tsx"
Cohesion: 0.08
Nodes (31): blankEvent(), CalendarPage(), days, reminderValue(), api(), AppData, AppState, AppStateProvider() (+23 more)

### Community 5 - "scripts"
Cohesion: 0.05
Nodes (36): next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream, devDependencies (+28 more)

### Community 6 - "db.mjs"
Cohesion: 0.14
Nodes (20): GET(), POST(), GET(), terminal, ensureColumn(), getDatabase(), openDatabase(), addJobEvent() (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 8 - "skills.mjs"
Cohesion: 0.17
Nodes (18): GET(), geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI() (+10 more)

### Community 9 - "auth.mjs"
Cohesion: 0.23
Nodes (17): GET(), authenticate(), base32(), clearLoginRateLimit(), enforceLoginRateLimit(), ensureOwner(), hashPassword(), hashToken() (+9 more)

### Community 10 - "ops.mjs"
Cohesion: 0.18
Nodes (12): GET(), safe(), backup, createBackup(), exportTables, exportWorkspace(), importV1(), keyFor() (+4 more)

### Community 11 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 12 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 13 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 14 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 15 - "page.tsx"
Cohesion: 0.40
Nodes (3): Language, Result, starters

## Knowledge Gaps
- **111 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+106 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `text()` connect `modules.mjs` to `core.mjs`, `AppState.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `AppStateProvider()` connect `AppState.tsx` to `modules.mjs`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `getDatabase()` connect `db.mjs` to `json`, `core.mjs`, `modules.mjs`, `skills.mjs`, `auth.mjs`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _111 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.12493599590373784 - nodes in this community are weakly interconnected._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07966101694915254 - nodes in this community are weakly interconnected._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07656341320864991 - nodes in this community are weakly interconnected._