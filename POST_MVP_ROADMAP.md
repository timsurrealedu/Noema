# LifeOS Post-MVP Roadmap

`Done` requires persisted behavior, authenticated APIs, trust-boundary validation, failure handling, responsive and keyboard-accessible UI, automated backend/browser coverage, and updated operations documentation.

## 1 — Mobile repository IDE

- [ ] Register repositories from explicitly allowed local paths
- [ ] Browse repository files without path traversal or symlink escape
- [ ] Edit multiple text files with optimistic version checks and size limits
- [ ] Review working-tree diffs before writes, commits, or reverts
- [ ] Run allowlisted terminal commands in isolated, time-limited sessions
- [ ] Show test/build output, Git status/history, commit, and revert workflows
- [ ] Verify phone navigation, keyboard editing, approvals, and repository isolation

## 2 — Advanced automation builder

- [x] Create, edit, duplicate, disable, and delete automations
- [ ] Compose validated triggers, conditions, and ordered actions
- [ ] Preview and test workflows without enabling them
- [x] Persist versioned definitions and immutable run-step history
- [x] Support retry/cancel from a failed step without duplicating completed effects
- [ ] Verify schedules, event triggers, validation, accessibility, and mobile editing

## 3 — Knowledge-graph visualization

- [ ] Persist typed nodes and relationships from LifeOS objects
- [ ] Provide authenticated filtered neighborhood and path APIs
- [ ] Render an accessible, responsive graph with list/table equivalents
- [ ] Open source objects and expose relationship provenance
- [ ] Support incremental rebuilds without leaking private object content
- [ ] Verify traversal correctness, keyboard access, and large-graph limits

## 4 — Plugin marketplace

- [ ] Define a versioned manifest, permissions, compatibility, and integrity model
- [ ] Browse installed and explicitly configured catalog plugins
- [ ] Inspect permissions and source before installation or upgrade
- [ ] Install, enable, disable, update, and uninstall transactionally
- [ ] Isolate plugin execution and audit permission-sensitive operations
- [ ] Verify malicious manifests, integrity failures, rollback, and offline behavior

## 5 — Custom dashboard builder

- [ ] Create, rename, duplicate, reorder, and delete dashboards
- [ ] Add, configure, resize, move, and remove allowlisted widgets
- [ ] Persist responsive layouts with optimistic version checks
- [ ] Provide keyboard controls and useful empty/error states
- [ ] Derive widget data from authenticated canonical APIs
- [ ] Verify layout validation, mobile adaptation, and accessibility

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
