# Noema

Personal-first, self-hosted Noema for capture, tasks, scheduling, knowledge, study, coding, and automations. The frontend is a responsive Next.js PWA; the local backend uses SQLite, authenticated APIs, durable jobs, isolated Codex execution, and a Bubblewrap compiler.

Existing installations may migrate environment variables from `LIFEOS_*` to `NOEMA_*` gradually. Noema prefers the new names but still reads the old names, existing `lifeos.sqlite`, cookies, browser offline queues, backups, and plugin manifests during the transition.

## Supported targets

- Node.js 22 LTS on Linux x64 with systemd and SQLite
- Current and previous major Chrome, Firefox, and Safari
- Current Android Chrome and iOS Safari, down to a 375px viewport
- Caddy or Tailscale Serve for deployment

Capture uses direct model APIs for low latency; Codex remains available for agentic work. Google Calendar provides encrypted, incremental two-way synchronization with explicit conflict review.

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

Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GLM_API_KEY`, `KIMI_API_KEY`, or `QWEN_API_KEY` server-side. Configure comma-separated `provider:model` candidates with `NOEMA_AI_FAST_CHAIN`, `NOEMA_AI_BALANCED_CHAIN`, and `NOEMA_AI_QUALITY_CHAIN`. Without chains, Capture tries Gemini → OpenAI fast → Codex, skipping unavailable providers. Fast is the default user profile. Attempts are timeout-bounded and recorded in content-free `ai_runs` metrics; prompts, capture text, extracted content, object IDs, and credentials are never stored there.

## Verification

```bash
npm test
npm run build
```

See [BACKEND_DESIGN.md](BACKEND_DESIGN.md), [BACKEND_ROADMAP.md](BACKEND_ROADMAP.md), and [FRONTEND_ROADMAP.md](FRONTEND_ROADMAP.md).
