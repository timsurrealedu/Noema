# Noema

Personal-first, self-hosted Noema for capture, tasks, scheduling, knowledge, study, coding, and automations. The frontend is a responsive Next.js PWA; the local backend uses SQLite, authenticated APIs, durable jobs, isolated Codex execution, and a Bubblewrap compiler.

Existing installations may migrate environment variables from `LIFEOS_*` to `NOEMA_*` gradually. Noema prefers the new names but still reads the old names, existing `lifeos.sqlite`, cookies, browser offline queues, backups, and plugin manifests during the transition.

## Supported targets

- Node.js 22 LTS on Linux x64 with systemd and SQLite
- Current and previous major Chrome, Firefox, and Safari
- Current Android Chrome and iOS Safari, down to a 375px viewport
- Caddy or Tailscale Serve for deployment

Codex is the primary AI provider. Gemini supplies capacity fallback and OCR/transcription; OpenAI is an additional capacity fallback. Google Calendar provides encrypted, incremental two-way synchronization with explicit conflict review.

## Feature status

| Feature | Status |
|---|---|
| Notes, tasks, calendar | Beta |
| Capture interpretation | Experimental |
| Google Calendar sync | Experimental |
| C/Python/JavaScript runner | Experimental; Linux only |
| Canvas, Tutor | Prototype |
| Plugins, collaboration, dashboards | Post-v1; frozen |
| Trading integration | Planned |

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set a strong `NOEMA_OWNER_PASSWORD` in `.env.local`. Backend features are disabled unless their environment flags are enabled.

Optional two-factor login: set `NOEMA_TOTP_SECRET` to the same 160-bit-or-longer base32 secret configured in your authenticator app. Enabling it also requires MFA-authenticated sessions for compiler runs, AI approvals, and session revocation.

Optional fallbacks: set `GEMINI_API_KEY` from Google AI Studio and/or `OPENAI_API_KEY`. The order is Codex → Gemini → OpenAI on explicit capacity/quota exhaustion. OpenAI routes simple tasks and schedules to `chat-latest`, notes and code to `gpt-5.6` with low reasoning, and math/research to `gpt-5.6` with medium reasoning. Override these with `NOEMA_GEMINI_MODEL`, `NOEMA_OPENAI_FAST_MODEL`, and `NOEMA_OPENAI_REASONING_MODEL`.

## Verification

```bash
npm test
npm run build
```

See [BACKEND_DESIGN.md](BACKEND_DESIGN.md), [BACKEND_ROADMAP.md](BACKEND_ROADMAP.md), and [FRONTEND_ROADMAP.md](FRONTEND_ROADMAP.md).
