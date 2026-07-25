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
- The first local backend slice now exists: Node SQLite/WAL persistence, FTS5, single-owner scrypt authentication and hashed sessions, idempotent/version-checked core APIs, durable jobs, a schema-bound Codex worker, and a Bubblewrap-isolated compiler. Captures close the full loop: interpretation proposals apply transactionally via `/captures/:id/apply` or `/jobs/:id/approve`, every mutation writes a reversible audit event (`/audit`, `/audit/:id/undo`), and job progress streams over SSE (`/jobs/:id/events`). Frontend core state hydrates from and mirrors to the API when authenticated, while retaining browser-local fallback. Offline queue, uploads, integrations, production hardening, and deployment remain.
- Implemented frontend milestone: Today/Quick Capture, Capture Inbox, advanced Tasks and Calendar views, persisted Markdown Vault, Study workflows, Canvas, project/repository/automation workspaces, global search, notifications, activity/undo, contextual AI planning, Settings/security/data controls, authentication, Help, route states, and PWA shell. Backend integrations remain simulated.
- `FRONTEND_ROADMAP.md` is the mutable done/partial/not-started checklist and implementation order; keep transient frontend progress there, not in this memory file.
- Dark is the default; light mode uses the same semantic roles. Teal is limited to primary actions, selection, and active processing; amber/red remain semantic.
- Graphify is maintained in `graphify-out/`; current extraction is code-only because semantic document extraction needs an external LLM backend.

## Commands and gotchas

- Install: `npm install`
- Run: `npm run dev` → `http://localhost:3000`
- Production check: `npm run build`
- Layout scan: `node /home/timsurreal/.agents/skills/impeccable/scripts/detect.mjs --json --scope layout app app/globals.css`
- Graph refresh: `graphify . --update --code-only --no-viz`
- Do not run `npm run build` while `npm run dev` is active: both write `.next` and can corrupt the dev server manifest. Stop dev, build, then restart.
- `npm audit` reports transitive Next.js `postcss`/`sharp` advisories. Its suggested `--force` repair downgrades Next.js to 9.3.3; do not apply blindly.
- Unsafe authenticated requests enforce same-origin checks; login attempts use an in-process per-identity limiter pending production-grade persistent throttling.
- Audit inverses are structured operations: `delete` (un-create), `restore` (full prior row), `capture-status`, and `delete-many` (interpretation apply). Undo executes the inverse in a transaction and appends a new non-reversible `undo` audit event; history is never deleted.
- Uploads stream to a temp file, are MIME-whitelisted (PDF, text, images, audio) and size-capped (50 MB), SHA-256-hashed, and atomically moved into a sharded object store under `.data/objects/`; identical content deduplicates to one asset row. Originals are served immutable from `/api/v1/assets/:id`, captures link assets through `capture_assets`, and the worker feeds deterministic extractions (`server/extract.mjs`: raw text, `pdftotext` for PDFs) into interpretation prompts. OCR/transcription adapters remain.
- Ten v1 AI workflows are managed in `skills/` and passed explicitly to isolated Codex runs; global user skills remain ignored. Vault and compiler tutors are read-only until the user applies their output.
- AI provider order is Codex → Gemini → OpenAI. `GEMINI_API_KEY`/`GOOGLE_API_KEY` and `OPENAI_API_KEY` stay server-only; failover is limited to disabled Codex or explicit capacity/quota errors. OpenAI uses the documented Instant alias `chat-latest` for simple tasks/schedules, `gpt-5.6` low for notes/code, and `gpt-5.6` medium for math/research. Actual handwritten-image ingestion still requires the planned upload/OCR pipeline.
