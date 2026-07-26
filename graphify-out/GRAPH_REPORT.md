# Graph Report - .  (2026-07-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 504 nodes · 1041 edges · 31 communities (23 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc91e5f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- json
- modules.mjs
- AppState.tsx
- page.tsx
- scripts
- ops.mjs
- compilerOptions
- auth.mjs
- skills.mjs
- compiler.mjs
- objects.mjs
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
5. `stamp()` - 18 edges
6. `idempotent()` - 17 edges
7. `compilerOptions` - 15 edges
8. `now()` - 14 edges
9. `audit()` - 13 edges
10. `getDatabase()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs
- `GET()` --calls--> `listState()`  [EXTRACTED]
  app/api/v1/state/route.ts → server/core.mjs
- `POST()` --calls--> `undoAuditEvent()`  [EXTRACTED]
  app/api/v1/audit/[id]/undo/route.ts → server/core.mjs
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs
- `POST()` --calls--> `applyCaptureInterpretation()`  [EXTRACTED]
  app/api/v1/captures/[id]/apply/route.ts → server/core.mjs

## Import Cycles
- None detected.

## Communities (31 total, 8 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.06
Nodes (65): POST(), GET(), GET(), GET(), GET(), POST(), GET(), POST() (+57 more)

### Community 1 - "json"
Cohesion: 0.12
Nodes (42): POST(), GET(), POST(), POST(), DELETE(), POST(), POST(), PATCH() (+34 more)

### Community 2 - "modules.mjs"
Cohesion: 0.08
Nodes (43): GET(), POST(), GET(), POST(), POST(), GET(), POST(), POST() (+35 more)

### Community 3 - "AppState.tsx"
Cohesion: 0.07
Nodes (35): blankEvent(), CalendarPage(), days, reminderValue(), api(), AppData, AppState, AppStateProvider() (+27 more)

### Community 4 - "page.tsx"
Cohesion: 0.07
Nodes (23): Automation, AutomationsPage(), empty, Metrics, request(), Run, when(), CaptureInbox() (+15 more)

### Community 5 - "scripts"
Cohesion: 0.05
Nodes (36): next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream, devDependencies (+28 more)

### Community 6 - "ops.mjs"
Cohesion: 0.12
Nodes (23): GET(), safe(), GET(), terminal, backup, ensureColumn(), getDatabase(), openDatabase() (+15 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 8 - "auth.mjs"
Cohesion: 0.23
Nodes (17): GET(), authenticate(), base32(), clearLoginRateLimit(), enforceLoginRateLimit(), ensureOwner(), hashPassword(), hashToken() (+9 more)

### Community 9 - "skills.mjs"
Cohesion: 0.20
Nodes (16): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+8 more)

### Community 10 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 11 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

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
- **112 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `ops.mjs` to `core.mjs`, `json`, `modules.mjs`, `auth.mjs`, `skills.mjs`, `objects.mjs`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05886075949367089 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.11841491841491841 - nodes in this community are weakly interconnected._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08215488215488216 - nodes in this community are weakly interconnected._
- **Should `AppState.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0696969696969697 - nodes in this community are weakly interconnected._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07112375533428165 - nodes in this community are weakly interconnected._