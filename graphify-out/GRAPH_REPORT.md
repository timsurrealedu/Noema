# Graph Report - .  (2026-07-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 485 nodes · 989 edges · 32 communities (24 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c4a87dc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- modules.mjs
- ModuleShell.tsx
- json
- scripts
- loadConfig
- AppState.tsx
- compilerOptions
- auth.mjs
- ops.mjs
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
5. `idempotent()` - 17 edges
6. `compilerOptions` - 15 edges
7. `loadConfig()` - 15 edges
8. `now()` - 14 edges
9. `stamp()` - 13 edges
10. `audit()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `enqueueJob()`  [EXTRACTED]
  app/api/v1/captures/[id]/interpret/route.ts → server/jobs.mjs
- `GET()` --calls--> `listState()`  [EXTRACTED]
  app/api/v1/state/route.ts → server/core.mjs
- `POST()` --calls--> `undoAuditEvent()`  [EXTRACTED]
  app/api/v1/audit/[id]/undo/route.ts → server/core.mjs
- `POST()` --calls--> `handle()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/http.mjs
- `POST()` --calls--> `json()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/http.mjs

## Import Cycles
- None detected.

## Communities (32 total, 8 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.08
Nodes (49): POST(), GET(), GET(), GET(), GET(), POST(), POST(), GET() (+41 more)

### Community 1 - "modules.mjs"
Cohesion: 0.09
Nodes (40): GET(), POST(), GET(), POST(), POST(), GET(), POST(), POST() (+32 more)

### Community 2 - "ModuleShell.tsx"
Cohesion: 0.06
Nodes (31): Automation, AutomationsPage(), empty, Metrics, request(), Run, when(), blankEvent() (+23 more)

### Community 3 - "json"
Cohesion: 0.17
Nodes (29): POST(), GET(), DELETE(), POST(), POST(), PATCH(), POST(), POST() (+21 more)

### Community 4 - "scripts"
Cohesion: 0.05
Nodes (36): next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream, devDependencies (+28 more)

### Community 5 - "loadConfig"
Cohesion: 0.13
Nodes (26): POST(), GET(), terminal, absolute(), ensureDataDirs(), loadConfig(), root, ensureColumn() (+18 more)

### Community 6 - "AppState.tsx"
Cohesion: 0.09
Nodes (23): api(), AppData, AppState, AppStateProvider(), Capture, CaptureObject, CaptureSource, Context (+15 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 8 - "auth.mjs"
Cohesion: 0.19
Nodes (21): POST(), POST(), GET(), authenticate(), base32(), clearLoginRateLimit(), enforceLoginRateLimit(), ensureOwner() (+13 more)

### Community 9 - "ops.mjs"
Cohesion: 0.18
Nodes (12): GET(), safe(), backup, createBackup(), exportTables, exportWorkspace(), importV1(), keyFor() (+4 more)

### Community 10 - "skills.mjs"
Cohesion: 0.20
Nodes (16): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+8 more)

### Community 11 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 12 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

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
- **113 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `loadConfig` to `modules.mjs`, `json`, `auth.mjs`, `skills.mjs`, `objects.mjs`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `json` to `auth.mjs`, `loadConfig`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `json()` connect `json` to `auth.mjs`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08748114630467571 - nodes in this community are weakly interconnected._
- **Should `ModuleShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0563265306122449 - nodes in this community are weakly interconnected._