# LifeOS v2 Backend Roadmap

## Phase 1 — Foundation

- [x] Runtime configuration and local environment template
- [x] SQLite connection, WAL settings, initial migration, FTS5, and test database
- [~] Single-owner authentication and session revocation; CSRF/origin and rate limits remain
- [~] Stable API error envelope and input validation; idempotency/version-conflict enforcement remains
- [~] Audit-event persistence exists; inverse application and undo endpoint remain

## Phase 2 — Core objects

- [~] Tasks, events, notes, captures, and Today state API; projects and relationships remain
- [ ] Markdown import/export and note version history
- [~] FTS5 note search; backlink index remains
- [~] Browser state hydrates and mirrors mutations through the API; durable offline queue remains

## Phase 3 — Capture and assets

- [~] Text capture and status lifecycle API; confirmation apply flow remains
- [ ] Streaming upload, validation, SHA-256 object storage, and source retrieval
- [ ] Deterministic document extraction adapters
- [ ] OCR and transcription adapters

## Phase 4 — Codex jobs

- [~] Durable database queue, leases, events, completion, failure, and cancellation flag; retries/reaping remain
- [x] Isolated read-only `codex exec --json` runner boundary
- [x] Capture interpretation schema and structured-result validation
- [ ] SSE job events and frontend status integration
- [~] Interpretation proposal storage; transactional apply, approval, and undo remain

## Phase 5 — Extended modules

- [ ] Study courses, assignments, cards, quizzes, and review scheduling
- [ ] Notifications and push subscriptions
- [ ] Automation definitions, schedules, run history, logs, and metrics
- [~] Bubblewrap-isolated compiler workspace for JavaScript, Python, C, C++, Go, Rust, and Java; Git worktree sessions and resource cgroups remain

## Phase 6 — Operations and migration

- [ ] systemd/Caddy-or-Tailscale deployment
- [ ] Encrypted backups, retention, integrity checks, and restore drill
- [ ] Health checks, structured redacted logs, and disk alerts
- [ ] v1 Markdown, attachment, task, and event importer
- [ ] Security and recovery acceptance test
