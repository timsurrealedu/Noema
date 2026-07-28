# Noema Backend Roadmap

## Phase 1 — Foundation

- [x] Runtime configuration and local environment template
- [x] SQLite connection, WAL settings, initial migration, FTS5, and test database
- [x] Single-owner authentication, session revocation, same-origin enforcement, and persistent login rate limits
- [x] Stable API error envelope, input validation, idempotent core mutations, and version-conflict enforcement
- [x] Audit-event persistence, inverse application, and undo endpoint

## Phase 2 — Core objects

- [x] Tasks, events, notes, captures, projects, task dependencies, and Today state API
- [x] Markdown import/export and note version history
- [x] FTS5 note search and backlink index
- [x] Browser state hydrates and mirrors mutations through the API with a durable offline queue

## Phase 3 — Capture and assets

- [x] Text/file capture and status lifecycle API with transactional confirmation apply
- [x] Streaming upload, validation, SHA-256 object storage, and source retrieval
- [x] Deterministic text, PDF, and DOCX extraction adapters
- [x] OCR and transcription adapters via Gemini multimodal

## Phase 4 — Codex jobs

- [x] Durable database queue, leases, events, completion, failure, retries, lease reclaim, and cancellation
- [x] Isolated read-only `codex exec --json` runner boundary
- [x] Capture interpretation schema and structured-result validation
- [x] SSE job events and frontend status integration
- [x] Interpretation proposal storage, transactional apply, job approval, and audit undo
- [x] Managed Codex ports for all v1 AI workflows, plus contextual Vault and Coding tutors
- [x] Capacity-aware Codex → Gemini → OpenAI fallback and workload-based OpenAI model/reasoning routing
- [x] Evaluate routing against representative schedule, note, code, research, and math fixtures

## Phase 5 — Extended modules

- [x] Study courses, assignments, cards, quizzes, and review scheduling
- [x] Notifications and push subscriptions
- [x] Automation definitions, schedules, run history, logs, and metrics
- [x] Bubblewrap-isolated compiler workspace for JavaScript, Python, C, C++, Go, Rust, and Java; Git worktree sessions and host-enforced cgroups

## Phase 6 — Operations and migration

- [x] systemd/Caddy-or-Tailscale deployment configuration
- [x] Encrypted backups, retention, integrity checks, and restore drill
- [x] Health checks, structured redacted logs, and disk alerts
- [x] v1 Markdown, attachment, task, and event importer
- [x] Security and recovery acceptance test
