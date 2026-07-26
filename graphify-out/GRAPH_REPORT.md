# Graph Report - .  (2026-07-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 465 nodes · 986 edges · 29 communities (23 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac22b16b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- json
- AppState.tsx
- modules.mjs
- ops.mjs
- scripts
- ModuleShell.tsx
- compilerOptions
- auth.mjs
- compiler.mjs
- objects.mjs
- ai.mjs
- jobs.mjs
- backend.test.js
- frontend.test.js
- page.tsx
- page.tsx
- page.tsx
- codex.mjs
- next.config.ts
- next-env.d.ts
- sw.js
- mjs.d.ts

## God Nodes (most connected - your core abstractions)
1. `json()` - 40 edges
2. `requireUser()` - 39 edges
3. `handle()` - 39 edges
4. `body()` - 18 edges
5. `idempotent()` - 17 edges
6. `loadConfig()` - 16 edges
7. `compilerOptions` - 15 edges
8. `getDatabase()` - 14 edges
9. `now()` - 14 edges
10. `stamp()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs
- `GET()` --calls--> `listState()`  [EXTRACTED]
  app/api/v1/state/route.ts → server/core.mjs
- `POST()` --calls--> `undoAuditEvent()`  [EXTRACTED]
  app/api/v1/audit/[id]/undo/route.ts → server/core.mjs
- `POST()` --calls--> `ensureOwner()`  [EXTRACTED]
  app/api/v1/auth/login/route.ts → server/auth.mjs
- `POST()` --calls--> `login()`  [EXTRACTED]
  app/api/v1/auth/login/route.ts → server/auth.mjs

## Import Cycles
- None detected.

## Communities (29 total, 6 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.08
Nodes (50): POST(), GET(), GET(), GET(), GET(), POST(), POST(), GET() (+42 more)

### Community 1 - "json"
Cohesion: 0.14
Nodes (37): POST(), GET(), POST(), POST(), POST(), POST(), PATCH(), POST() (+29 more)

### Community 2 - "AppState.tsx"
Cohesion: 0.06
Nodes (43): blankEvent(), CalendarPage(), days, CaptureInbox(), CaptureRow(), Filter, filters, matches() (+35 more)

### Community 3 - "modules.mjs"
Cohesion: 0.09
Nodes (40): GET(), POST(), GET(), POST(), POST(), GET(), POST(), POST() (+32 more)

### Community 4 - "ops.mjs"
Cohesion: 0.10
Nodes (27): POST(), POST(), GET(), terminal, backup, absolute(), ensureDataDirs(), loadConfig() (+19 more)

### Community 5 - "scripts"
Cohesion: 0.06
Nodes (32): next, dependencies, next, @phosphor-icons/react, react, react-dom, devDependencies, @types/node (+24 more)

### Community 6 - "ModuleShell.tsx"
Cohesion: 0.10
Nodes (10): automations, sessions, ModalDialog(), ModuleShell(), nav, shortcuts, activity, nav (+2 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 8 - "auth.mjs"
Cohesion: 0.24
Nodes (15): DELETE(), GET(), authenticate(), clearLoginRateLimit(), enforceLoginRateLimit(), ensureOwner(), hashPassword(), hashToken() (+7 more)

### Community 9 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 10 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

### Community 11 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 12 - "jobs.mjs"
Cohesion: 0.64
Nodes (7): addJobEvent(), cancelJob(), claimJob(), enqueueJob(), failJob(), finishJob(), now()

### Community 13 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 14 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 15 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 16 - "page.tsx"
Cohesion: 0.40
Nodes (3): Language, Result, starters

## Knowledge Gaps
- **100 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `ops.mjs` to `core.mjs`, `json`, `modules.mjs`, `auth.mjs`, `objects.mjs`, `jobs.mjs`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `loadConfig()` connect `ops.mjs` to `core.mjs`, `json`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `json` to `auth.mjs`, `ops.mjs`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08022598870056497 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.13721804511278196 - nodes in this community are weakly interconnected._
- **Should `AppState.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05513784461152882 - nodes in this community are weakly interconnected._