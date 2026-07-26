# LifeOS Project Memory

## Product and design

- Personal-first responsive web/PWA; self-hosting power user is the initial audience.
- Core promise: capture anything, then expose understandable, reversible AI interpretation.
- Approved visual direction: calm, dark-first, restrained teal, high hierarchy, low visual noise. Show only page-critical information; disclose detail on demand.
- Avoid corporate analytics, chatbot-first, sci-fi HUD, playful widget, glass, gradient, and metric-tile aesthetics.
- Preserve WCAG 2.2 AA fundamentals, original capture sources, non-color state cues, and mobile structural adaptation.
- `PRODUCT.md` owns product intent; `DESIGN.md` owns visual rules. Update them when those decisions change.

## Implementation decisions

- Next.js App Router, React, TypeScript, plain CSS tokens, Phosphor icons. No component framework or state library until complexity earns one.
- The local backend includes Node SQLite/WAL persistence, FTS5, projects, task dependencies, note backlinks, single-owner scrypt authentication and hashed sessions, idempotent/version-checked core APIs, durable jobs, a schema-bound Codex worker, and a Bubblewrap-isolated compiler. Captures close the full loop: text or file capture, immutable assets, PDF/DOCX extraction, Gemini OCR/transcription, transactional proposal apply, reversible audit, and SSE progress. Frontend core state hydrates from and mirrors to the API when authenticated, while retaining browser-local fallback. Global search opens exact objects, header notifications persist read state, and Automations uses the API for definitions, enablement, manual runs, history, logs, schedules, and metrics. External integrations, production hardening, and deployment remain.
- `BACKEND_ROADMAP.md` and `FRONTEND_ROADMAP.md` own mutable implementation status and next work; keep transient progress out of this memory file.
- Dark is the default; light mode uses the same semantic roles. Teal is limited to primary actions, selection, and active processing; amber/red remain semantic.
- Graphify is maintained in `graphify-out/`; current extraction is code-only because semantic document extraction needs an external LLM backend.

## Commands and gotchas

- Install: `npm install`
- Run: `npm run dev` → `http://localhost:3000`
- Production check: `npm run build`
- Layout scan: `node /home/timsurreal/.agents/skills/impeccable/scripts/detect.mjs --json --scope layout app app/globals.css`
- Graph refresh: `graphify . --update --code-only --no-viz`
- Backup: `npm run backup`; verify independently with `npm run verify:backup -- <file>`.
- Portable export: Settings → Data → Export workspace downloads a `.tar` containing `workspace.json` and original assets; credentials, sessions, provider secrets, push endpoints, rate limits, TOTP replay state, and idempotency records are excluded.
- v1 import: `npm run import:v1 -- <export-directory>`.
- Do not run `npm run build` while `npm run dev` is active: both write `.next` and can corrupt the dev server manifest. Stop dev, build, then restart.
- `npm audit` reports transitive Next.js `postcss`/`sharp` advisories. Its suggested `--force` repair downgrades Next.js to 9.3.3; do not apply blindly.
- Login rate limiting is durable in the `login_attempts` table (5 attempts per 15 minutes per identity, surviving restarts); optional RFC 6238 TOTP is enabled by server-only `LIFEOS_TOTP_SECRET` and rejects code replay. Unsafe authenticated requests enforce same-origin checks. Sessions list via `/api/v1/auth/sessions` and revoke per device. Failed jobs retry up to `max_attempts` (default 3) and expired leases are reclaimed by the next worker claim; cancel requests are honored at claim time. Failed browser mutations land in a localStorage offline queue and replay with their original idempotency keys on reconnect.
- Audit inverses are structured operations: `delete` (un-create), `restore` (full prior row), `capture-status`, and `delete-many` (interpretation apply). Undo executes the inverse in a transaction and appends a new non-reversible `undo` audit event; history is never deleted.
- Tasks and events persist absolute reminder timestamps. The worker atomically converts due reminders into notifications and records delivery timestamps, preventing duplicate delivery after restart.
- Uploads stream to a temp file, are MIME-whitelisted (PDF, DOCX, text, images, audio) and size-capped (50 MB), SHA-256-hashed, and atomically moved into a sharded object store under `.data/objects/`; identical content deduplicates to one asset row. Originals are served immutable from `/api/v1/assets/:id`, captures link assets through `capture_assets`, and the worker feeds raw text, `pdftotext`, DOCX XML, or Gemini OCR/transcription into interpretation prompts.
- Ten v1 AI workflows are managed in `skills/` and passed explicitly to isolated Codex runs; global user skills remain ignored. Vault and compiler tutors are read-only until the user applies their output.
- AI provider order is Codex → Gemini → OpenAI. `GEMINI_API_KEY`/`GOOGLE_API_KEY` and `OPENAI_API_KEY` stay server-only; failover is limited to disabled Codex or explicit capacity/quota errors. OpenAI uses `chat-latest` for simple tasks/schedules, `gpt-5.6` low for notes/code, and `gpt-5.6` medium for math/research. Handwritten images enter through file capture and Gemini OCR.
