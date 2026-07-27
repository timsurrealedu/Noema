# LifeOS Post-MVP Roadmap

`Done` requires persisted behavior, authenticated APIs, trust-boundary validation, failure handling, responsive and keyboard-accessible UI, automated backend/browser coverage, and updated operations documentation.

## 1 — Mobile repository IDE

- [x] Register repositories from explicitly allowed local paths
- [x] Browse repository files without path traversal or symlink escape
- [x] Edit multiple text files with optimistic version checks and size limits
- [x] Review working-tree diffs before writes, commits, or reverts
- [x] Run allowlisted terminal commands in isolated, time-limited sessions
- [x] Show test/build output, Git status/history, commit, and revert workflows
- [x] Verify phone navigation, keyboard editing, approvals, and repository isolation

## 2 — Advanced automation builder

- [x] Create, edit, duplicate, disable, and delete automations
- [x] Compose validated triggers, conditions, and ordered actions
- [x] Preview and test workflows without enabling them
- [x] Persist versioned definitions and immutable run-step history
- [x] Support retry/cancel from a failed step without duplicating completed effects
- [x] Verify schedules, event triggers, validation, accessibility, and mobile editing

## 3 — Knowledge-graph visualization

- [x] Persist typed nodes and relationships from LifeOS objects
- [x] Provide authenticated filtered neighborhood and path APIs
- [x] Render an accessible, responsive graph with list/table equivalents
- [x] Open source objects and expose relationship provenance
- [x] Support incremental rebuilds without leaking private object content
- [x] Verify traversal correctness, keyboard access, and large-graph limits

## 4 — Plugin marketplace

- [x] Define a versioned manifest, permissions, compatibility, and integrity model
- [x] Browse installed and explicitly configured catalog plugins
- [x] Inspect permissions and source before installation or upgrade
- [x] Install, enable, disable, update, and uninstall transactionally
- [x] Isolate plugin execution and audit permission-sensitive operations
- [x] Verify malicious manifests, integrity failures, rollback, and offline behavior

## 5 — Custom dashboard builder

- [x] Create, rename, duplicate, reorder, and delete dashboards
- [x] Add, configure, resize, move, and remove allowlisted widgets
- [x] Persist responsive layouts with optimistic version checks
- [x] Provide keyboard controls and useful empty/error states
- [x] Derive widget data from authenticated canonical APIs
- [x] Verify layout validation, mobile adaptation, and accessibility

## 6 — Multiplayer collaboration

- [ ] Replace single-owner assumptions with explicit workspace membership and roles
- [ ] Invite, accept, revoke, and list members with expiring single-use tokens
- [ ] Enforce authorization on every workspace-scoped API and asset
- [ ] Attribute changes, comments, presence, and audit events to actors
- [ ] Detect conflicting edits and preserve both recoverable versions
- [ ] Verify cross-workspace isolation, role boundaries, revocation, and concurrency

## 7 — Financial execution controls

- [ ] Model financial accounts and proposed actions without storing raw credentials
- [ ] Require explicit policy limits, current data, and deterministic previews
- [ ] Require recent MFA and session-bound single-use approval for every execution
- [ ] Enforce idempotency, dual control where configured, and immutable audit evidence
- [ ] Reconcile provider state and surface partial, rejected, and unknown outcomes
- [ ] Default to simulation; verify limits, replay resistance, provider failure, and recovery

## 8 — Release and operations

- [ ] Resolve or explicitly mitigate production dependency advisories
- [ ] Run unit, integration, browser, accessibility, visual, backup, and recovery gates
- [ ] Complete a production deployment and rollback drill
- [ ] Refresh `PROJECT.md`, both original roadmaps, README/operations docs, and Graphify
- [ ] Prove every item above with current code, tests, runtime evidence, and GitHub state
