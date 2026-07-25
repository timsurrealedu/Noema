# LifeOS v2 Backend Roadmap

## Phase 1 — Foundation

- [x] Runtime configuration and local environment template
- [x] SQLite connection, WAL settings, initial migration, FTS5, and test database
- [x] Single-owner authentication, session revocation, same-origin enforcement, and persistent login rate limits
- [x] Stable API error envelope, input validation, idempotent core mutations, and version-conflict enforcement
- [x] Audit-event persistence, inverse application, and undo endpoint

## Phase 2 — Core objects

- [~] Tasks, events, notes, captures, and Today state API; projects and relationships remain
- [ ] Markdown import/export and note version history
- [~] FTS5 note search; backlink index remains
- [x] Browser state hydrates and mirrors mutations through the API with a durable offline queue

## Phase 3 — Capture and assets

- [~] Text capture and status lifecycle API with transactional confirmation apply; file capture remains
- [x] Streaming upload, validation, SHA-256 object storage, and source retrieval
- [~] Deterministic document extraction adapters (text and pdftotext); DOCX and other formats remain
- [ ] OCR and transcription adapters

## Phase 4 — Codex jobs

- [x] Durable database queue, leases, events, completion, failure, retries, lease reclaim, and cancellation
- [x] Isolated read-only `codex exec --json` runner boundary
- [x] Capture interpretation schema and structured-result validation
- [x] SSE job events and frontend status integration
- [x] Interpretation proposal storage, transactional apply, job approval, and audit undo
- [x] Managed Codex ports for all v1 AI workflows, plus contextual Vault and Coding tutors
- [x] Capacity-aware Codex → Gemini → OpenAI fallback and workload-based OpenAI model/reasoning routing
- [ ] Evaluate routing against representative schedule, note, code, research, and math fixtures

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
