# LifeOS Frontend Roadmap

Frontend status is separate from backend integration. `Done` means the interaction is implemented in the browser. `Integrated` means it persists through the authenticated API and has failure handling. Sample-state controls are prototypes, not complete features. Runtime failures must show the shared connection notice; controls backed by an existing API must not show a blanket “Not connected yet” notice.

## Completion contract

- `Done`: browser interaction works at supported widths with keyboard access and real state transitions.
- `Integrated`: authenticated API, persistence, validation, retry/error behavior, and at least one automated end-to-end check work.
- `Verified`: supported browser/device matrix, WCAG 2.2 AA audit, and visual baselines pass.
- `Deferred`: explicitly outside the MVP; it does not block `v1.0.0`.

Supported MVP targets:

- Runtime/deployment: Node.js 22 LTS on Linux x64, systemd, SQLite, and Caddy or Tailscale Serve.
- Desktop browsers: current and previous major Chrome, Firefox, and Safari.
- Mobile/PWA: current Android Chrome and iOS Safari; 375px minimum viewport.
- AI providers: Codex primary, Gemini capacity fallback plus OCR/transcription, and OpenAI capacity fallback.
- Calendar sync: Google Calendar is the first supported external provider; no other external provider is in MVP scope.

## Frontend milestone

### Done

- [x] Responsive desktop shell and mobile navigation
- [x] Dark/light semantic themes with persisted preference
- [x] Today summary, timeline, attention, activity, and quick capture
- [x] Capture inbox, source/status states, review, retry, dismiss, and undo
- [x] Task creation, editing, recurrence fields, subtasks, completion, archive, and views
- [x] Calendar day, week, month, agenda, creation, and editing interfaces
- [x] Durable task/event reminders with restart-safe notification delivery
- [x] Vault search, views, Markdown editor, split/read modes, import/export, properties, source, trash, and AI provenance
- [x] Persisted Draft notes with durable optimization jobs, before/after review, explicit apply/reject, and version recovery
- [x] Persisted Tutor sessions with provider/citation provenance and reversible, idempotent note insertion
- [x] Study upload/camera, processing-result, source comparison, flashcard, quiz, and assignment interfaces
- [x] Handwriting and mathematical recognition through image upload
- [x] Project, repository, coding-agent, automation, and Canvas workspaces
- [x] Global navigation search, notifications, contextual AI panel, Activity, Settings, Help, and authentication surfaces
- [x] Shared accessible fallback for AI, authentication, server persistence, integrations, and remote execution
- [x] PWA manifest, service worker, offline shell, share target, update notice, and raster icons
- [x] Loading, empty, error, offline, retry, permission, and partial-success patterns
- [x] Visible focus, non-color states, reduced motion, mobile safe areas, and 44px primary targets

### Remaining verification

- [x] Full browser interaction suite for primary desktop and mobile flows
- [x] WCAG 2.2 AA screen-reader, focus-trap, zoom, and text-scaling audit
- [x] Pixel baselines at 375, 768, 1024, and 1440px
- [x] Installability verification on a supported mobile browser

## Backend integration backlog

- [x] Authentication, sessions, optional TOTP login, and revocation
  - Complete when Settings enrolls/disables TOTP, recovery codes are generated once and stored hashed, recovery invalidates used codes, and browser tests cover enrollment, login, recovery, and revocation.
- [x] Durable database persistence, synchronization, encrypted backup, and full workspace export
- [x] Codex interpretation service with review, approval, cancellation, and audit records
  - Complete when quick capture uses real interpretation results, sensitive execution shows the actual command/diff, approval is MFA-bound and single-use, SSE reconnects without duplicate events, and cancel/retry paths have browser coverage.
- [x] File/object storage, OCR, transcription, source preservation, and attachment retrieval
- [x] Google Calendar synchronization
  - Complete when account connect/revoke, initial import, incremental two-way sync, token refresh, deduplication, conflict handling, deletion, retry, and last-sync/error UI pass integration tests.
- [x] Notifications, automation execution, job logs, metrics, and schedules
  - Header notifications persist read status. Automations reads API definitions, enablement, schedules, manual runs, history, logs, and metrics. Complete when durable cancellation/retry, push delivery, and reconnecting live updates pass browser tests.
- [x] Global search, backlink indexing, and relationship persistence
  - Global palette queries `/api/v1/search`; unified results cover notes, tasks, events, projects, and captures, and selection opens the specific object. Complete when semantic ranking is optional and source-attributed, and unavailable embeddings degrade to FTS without losing results.
- [x] Privacy-safe analytics
  - Complete when an allowlisted schema excludes note/capture bodies, attachments, prompts, and extracted text; opt-out and deletion work; and tests reject private-content fields and values.

## MVP acceptance matrix

| # | Requirement | Frontend | Integration |
|---|---|---|---|
| 1 | Natural-language capture on desktop/mobile | Done | Server-backed; AI provider configuration required |
| 2 | Structured interpretation review | Done | Server apply done; AI provider configuration required |
| 3 | Create/edit tasks | Done | Synced + offline queue |
| 4 | Create/edit events | Done | Synced + offline queue |
| 5 | Tasks/events appear on Today | Done | Synced + offline queue |
| 6 | Create/edit/search notes | Done | Synced + offline queue |
| 7 | Markdown portability | Done | Local import/export |
| 8 | Original images remain linked | Done UI | Object storage + retrieval done |
| 9 | AI information identified | Done | Provider configuration required |
| 10 | AI actions can be undone | Done UI | Durable audit + undo done |
| 11 | Phone-sized usability | Done | Verification pending |
| 12 | Installable PWA | Done UI | Device verification pending |
| 13 | Loading/error states | Done | Core mutation errors wired; full browser verification pending |
| 14 | AI/system activity visible | Done | Audit and undo API wired |
| 15 | Automation status separated from Today | Done | Executor/API done; Automations page still uses sample state |
| 16 | Keyboard primary flows | Done | Formal audit pending |
| 17 | Light/dark modes | Done | Browser-local |
| 18 | Private notes excluded from analytics | Done | Opt-in local allowlist rejects content and identifiers; deletion verified |
| 19 | Portable note export | Done | Local Markdown |
| 20 | Sensitive actions require confirmation | Done | Exact command, file, and source review; recent MFA; session-bound single-use approval |

## Deferred beyond MVP

Detailed acceptance criteria and implementation status now live in `POST_MVP_ROADMAP.md`.

- [ ] Full mobile repository IDE (the responsive single-file compiler/editor is complete; repository browsing, multi-file editing, diffs, terminal sessions, and source-control workflows are deferred)
- [ ] Advanced automation builder
- [ ] Knowledge-graph visualization
- [ ] Multiplayer collaboration
- [ ] Financial execution controls
- [ ] Plugin marketplace
- [ ] Custom dashboard builder
