# LifeOS v2 Backend Design

Status: proposed architecture for the first backend implementation.

## Goals

- Preserve original captures and make every AI action reviewable, attributable, and reversible.
- Run Codex on the Oracle host without giving browser clients shell or filesystem access.
- Keep operations small enough for one personal Oracle box.
- Support desktop/mobile synchronization, offline capture, streaming jobs, and portable Markdown exports.

## Architecture

Use one repository and three runtime processes:

1. **Next.js web** — UI, authenticated route handlers, validation, and SSE endpoints.
2. **LifeOS worker** — claims durable jobs, invokes Codex or deterministic processors, and records events/results.
3. **Backup timer** — SQLite online backup plus encrypted file archive rotation.

Core storage:

- **SQLite in WAL mode** for application data, job queue, audit history, sessions, and FTS5 search.
- **Filesystem object store** for immutable uploads, addressed by SHA-256.
- **Markdown export layer** for portable notes; database state remains authoritative while every note can round-trip as Markdown.

This replaces v1’s direct browser-to-Express/file mutations and avoids operating PostgreSQL, Redis, and a separate queue for a single-owner deployment.

## Trust boundaries

```text
Browser/PWA
  │ HTTPS + secure session + CSRF/origin checks
  ▼
Next.js route handlers
  │ validated commands only
  ├── SQLite / object store
  └── durable job row
          │ claim lease
          ▼
      worker service
          │ isolated staging directory
          ▼
      codex exec --json
          │ structured proposal/results
          ▼
      validator → user review → transactional apply → audit event
```

Codex never receives session secrets, database credentials, the whole vault by default, or direct write access to canonical storage.

## Data model

All mutable tables include `id`, `created_at`, `updated_at`, and `version` for optimistic concurrency.

| Area | Tables | Important fields |
|---|---|---|
| Identity | `users`, `sessions`, `recovery_codes` | password hash, expiry, revoked time, device metadata |
| Capture | `captures`, `capture_assets`, `interpretations` | original text/source, processing state, confidence, proposed object JSON |
| Work | `tasks`, `task_dependencies`, `events`, `projects` | status, schedule, recurrence, relationships |
| Knowledge | `notes`, `note_versions`, `note_links`, `assets` | Markdown, source asset, AI provenance, content hash |
| Study | `courses`, `assignments`, `study_items`, `reviews` | source note, due date, spaced-review state |
| Agents | `jobs`, `job_events`, `job_artifacts`, `approvals` | kind, state, lease, input/output hashes, risk level |
| Operations | `automations`, `automation_runs`, `notifications`, `audit_events` | schedule, run state, actor, inverse operation |

Use explicit join tables for relationships. Do not hide core relationships inside arbitrary JSON. JSON is appropriate for immutable job inputs, structured AI proposals, and provider event payloads.

## Capture pipeline

1. Client creates a capture with an idempotency key; text is immediately durable.
2. Files stream to a temporary path, are size/type checked, hashed, then atomically moved to the object store.
3. Server inserts a queued interpretation job in the same transaction.
4. Worker extracts deterministic text first (`pdftotext`, document parser, metadata). OCR/transcription become adapters.
5. Codex receives the capture, extracted text, allowed context, and a strict JSON output schema.
6. The interpretation is stored as a proposal. Nothing is applied automatically.
7. User edits and confirms the proposal.
8. Server applies tasks/events/notes in one transaction and writes inverse audit operations.

Offline clients retain captures in IndexedDB and retry with the same idempotency key.

## Codex runner

Invoke the installed CLI directly—never through a shell string:

```text
codex exec
  --json
  --ephemeral
  --ignore-user-config
  --output-schema <job-schema.json>
  --sandbox read-only|workspace-write
  --cd <isolated-job-directory>
  -
```

The prompt is written to stdin. Arguments are passed as an array. `--dangerously-bypass-approvals-and-sandbox` is forbidden.

Runner rules:

- Read-only interpretation/search jobs use `--sandbox read-only`.
- Code jobs use a disposable Git worktree and `workspace-write`.
- Each job has a deadline, output limit, cancellation signal, and renewable database lease.
- Parse JSONL incrementally into normalized `job_events`; stream those events to the UI through SSE.
- Validate the final message against a per-job JSON Schema before storing a proposal.
- One mutating Codex job at a time initially; read-only concurrency is configurable.
- User approval applies validated diffs or commands. Codex cannot approve its own action.

## Job states

`queued → claimed → running → awaiting_review → applying → completed`

Terminal alternatives: `failed`, `cancelled`, `expired`.

Every transition is conditional on the current state and version. A worker crash leaves a lease that another worker can reclaim after expiry.

## API surface

Use versioned route handlers under `/api/v1`:

- `/auth/login`, `/auth/logout`, `/auth/sessions`
- `/captures`, `/captures/:id`, `/captures/:id/interpret`
- `/tasks`, `/events`, `/projects`, `/notes`, `/assets`
- `/search`
- `/jobs`, `/jobs/:id/events`, `/jobs/:id/cancel`, `/jobs/:id/approve`
- `/automations`, `/automation-runs`
- `/notifications`, `/audit`, `/export`, `/backup`

Mutations accept an idempotency key and expected object version. Errors use one stable envelope:

```json
{"error":{"code":"VERSION_CONFLICT","message":"This item changed on another device.","retryable":false}}
```

## Authentication and security

- Single-owner account for MVP; Argon2id password hash and optional passkey later.
- `HttpOnly`, `Secure`, `SameSite=Lax` opaque session cookie; store only a session-token hash.
- Rotate sessions after login and sensitive account changes; allow per-device revocation.
- Require re-authentication for destructive, credential, production, or financial actions.
- Validate `Origin` on mutations, enforce request/body/file limits, and rate-limit login and job creation.
- Bind the application to loopback behind Caddy or Tailscale Serve. Keep the Oracle firewall closed except SSH/Tailscale.
- Run web and worker as an unprivileged `lifeos` service account. Separate writable data, job, and backup directories.
- Redact secrets and private note bodies from logs and analytics.

## Reversibility and audit

Each applied command writes an `audit_event` containing actor, source capture/job, affected object versions, safe summary, and an inverse operation. Undo is another authorized transaction, not deletion of history.

Assets are immutable. User deletion first moves records to trash; physical purging is a separate confirmed maintenance job after retention expires.

## Deployment on the Oracle box

- Node.js LTS, Codex CLI, SQLite, Caddy or Tailscale Serve, and systemd.
- `lifeos-web.service` and `lifeos-worker.service` use separate environment files and restart policies.
- Store runtime data outside the Git checkout, e.g. `/var/lib/lifeos`, owned by the service account.
- Nightly encrypted backups: SQLite online backup, object manifest verification, archive, retention rotation, and periodic restore test.
- Health endpoints check process, database, disk space, worker heartbeat, and Codex availability without exposing secrets.

## Migration from lifeOS v1

Reuse concepts, not its unrestricted execution boundary:

- Import existing Markdown and attachments; preserve relative paths and content hashes.
- Convert TODO checkboxes and local events into typed objects while retaining source-note links.
- Port SSE progress semantics and provider-visible status messages.
- Replace `spawnClaude()` with the isolated Codex runner.
- Replace direct file mutations with proposals, validation, transactions, versions, and audit events.
- Keep Syncthing only as an optional export/backup transport—not concurrent mutation of live database files.

## Delivery slices

1. Foundation: configuration, SQLite migrations, sessions, error envelope, audit primitive.
2. Local objects: tasks, events, notes, projects, Today queries, Markdown export.
3. Capture: text/files, object store, IndexedDB sync contract, inbox lifecycle.
4. Codex: durable queue, runner, schemas, SSE, cancellation, interpretation review/apply.
5. Knowledge/study: extraction adapters, backlinks, FTS5, courses and assignments.
6. Operations: notifications, automations, repository worktrees, backups, v1 importer.

## Decisions to confirm before implementation

- Keep SQLite/file storage or require PostgreSQL/S3-compatible storage.
- Keep the service Tailscale-only or expose it publicly through a domain.
- Use password login for MVP or require passkeys immediately.
- Keep Markdown as an export format or make a filesystem vault canonical again.
