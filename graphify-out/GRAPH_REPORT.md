# Graph Report - .  (2026-07-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 478 nodes · 1005 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b3c3b33`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.mjs
- AppState.tsx
- json
- modules.mjs
- scripts
- skills.mjs
- ModuleShell.tsx
- compilerOptions
- auth.mjs
- ops.mjs
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
1. `json()` - 44 edges
2. `handle()` - 43 edges
3. `requireUser()` - 38 edges
4. `body()` - 20 edges
5. `loadConfig()` - 17 edges
6. `idempotent()` - 17 edges
7. `compilerOptions` - 15 edges
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
- `POST()` --calls--> `revokeSession()`  [EXTRACTED]
  app/api/v1/auth/logout/route.ts → server/auth.mjs
- `POST()` --calls--> `applyCaptureInterpretation()`  [EXTRACTED]
  app/api/v1/captures/[id]/apply/route.ts → server/core.mjs

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "core.mjs"
Cohesion: 0.08
Nodes (49): POST(), GET(), GET(), GET(), GET(), POST(), POST(), GET() (+41 more)

### Community 1 - "AppState.tsx"
Cohesion: 0.06
Nodes (43): blankEvent(), CalendarPage(), days, CaptureInbox(), CaptureRow(), Filter, filters, matches() (+35 more)

### Community 2 - "json"
Cohesion: 0.15
Nodes (33): POST(), GET(), POST(), POST(), DELETE(), POST(), POST(), PATCH() (+25 more)

### Community 3 - "modules.mjs"
Cohesion: 0.09
Nodes (40): GET(), POST(), GET(), POST(), POST(), GET(), POST(), POST() (+32 more)

### Community 4 - "scripts"
Cohesion: 0.05
Nodes (36): next, dependencies, next, @phosphor-icons/react, react, react-dom, tar-stream, devDependencies (+28 more)

### Community 5 - "skills.mjs"
Cohesion: 0.12
Nodes (26): POST(), GET(), terminal, absolute(), ensureDataDirs(), loadConfig(), root, ensureColumn() (+18 more)

### Community 6 - "ModuleShell.tsx"
Cohesion: 0.10
Nodes (10): automations, sessions, ModalDialog(), ModuleShell(), nav, shortcuts, activity, nav (+2 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 8 - "auth.mjs"
Cohesion: 0.23
Nodes (17): GET(), authenticate(), base32(), clearLoginRateLimit(), enforceLoginRateLimit(), ensureOwner(), hashPassword(), hashToken() (+9 more)

### Community 9 - "ops.mjs"
Cohesion: 0.18
Nodes (12): GET(), safe(), backup, createBackup(), exportTables, exportWorkspace(), importV1(), keyFor() (+4 more)

### Community 10 - "compiler.mjs"
Cohesion: 0.28
Nodes (10): GET(), buildCommand(), cleanupWorktree(), compilerCapabilities(), execute(), hasCommand(), isInsideGitRepo(), languages (+2 more)

### Community 11 - "objects.mjs"
Cohesion: 0.30
Nodes (8): GET(), POST(), allowedMimes, assetPath(), attachAssets(), getAsset(), now(), storeAsset()

### Community 12 - "ai.mjs"
Cohesion: 0.38
Nodes (9): geminiSchema(), isCapacityError(), runAI(), runFallback(), runGemini(), runGeminiMultimodal(), runOpenAI(), schemaKeys (+1 more)

### Community 13 - "jobs.mjs"
Cohesion: 0.64
Nodes (7): addJobEvent(), cancelJob(), claimJob(), enqueueJob(), failJob(), finishJob(), now()

### Community 14 - "backend.test.js"
Cohesion: 0.29
Nodes (5): assert, {join}, {mkdtempSync,rmSync}, test, {tmpdir}

### Community 15 - "frontend.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 16 - "page.tsx"
Cohesion: 0.40
Nodes (3): AuditEvent, icons, time

### Community 17 - "page.tsx"
Cohesion: 0.40
Nodes (3): Language, Result, starters

## Knowledge Gaps
- **103 isolated node(s):** `config`, `target`, `dom`, `dom.iterable`, `esnext` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `skills.mjs` to `core.mjs`, `json`, `modules.mjs`, `auth.mjs`, `objects.mjs`, `jobs.mjs`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `loadConfig()` connect `skills.mjs` to `core.mjs`, `json`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `config`, `target`, `dom` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `core.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._
- **Should `AppState.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05513784461152882 - nodes in this community are weakly interconnected._
- **Should `modules.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08748114630467571 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._