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

Optional two-factor login: set `NOEMA_TOTP_SECRET` to the same 160-bit-or-longer base32 secret configured in your authenticator app. Enabling it also requires MFA-authenticated sessions for AI approvals and session revocation. Compiler runs require an authenticated editor session and execute immediately inside the configured isolation boundary.

Google login uses `NOEMA_GOOGLE_CLIENT_ID`, `NOEMA_GOOGLE_CLIENT_SECRET`, and `NOEMA_GOOGLE_LOGIN_REDIRECT_URI`. It accepts only verified Google accounts that already belong to a workspace or have an active workspace invitation; the first invited Google sign-in creates a private `My workspace`, consumes the shared-workspace invitation, and persists a subject-bound account and session.

Saved compiler files use `NOEMA_SAVED_CODE_DIR` (default `~/Documents/mycode/snippets`). Only allowlisted text/code extensions up to 1 MiB are editable; traversal and symlinks are rejected and saves are atomic.

Set `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `GLM_API_KEY`, `KIMI_API_KEY`, or `QWEN_API_KEY` server-side. Groq uses its OpenAI-compatible endpoint with `NOEMA_GROQ_MODEL` defaulting to `llama-3.1-8b-instant`; set `NOEMA_GROQ_MODEL=llama-3.3-70b-versatile` for higher-quality text work. With `OPENROUTER_API_KEY`, every unconfigured profile (Fast, Balanced, Quality) falls back to `openrouter/free`, which selects from OpenRouter's current free-model pool; override it with `NOEMA_OPENROUTER_MODEL`. Configure comma-separated `provider:model` candidates with `NOEMA_AI_FAST_CHAIN`, `NOEMA_AI_BALANCED_CHAIN`, and `NOEMA_AI_QUALITY_CHAIN`; explicit chains and saved per-profile agents take precedence over the default fallback. Without them, Capture tries Gemini → Groq → OpenAI fast → OpenRouter → Codex, skipping unavailable providers. Fast is the default user profile. Attempts are timeout-bounded and recorded in content-free `ai_runs` metrics; prompts, capture text, extracted content, object IDs, and credentials are never stored there.

## Verification

```bash
npm test
npm run build
```

See [BACKEND_DESIGN.md](BACKEND_DESIGN.md), [BACKEND_ROADMAP.md](BACKEND_ROADMAP.md), and [FRONTEND_ROADMAP.md](FRONTEND_ROADMAP.md).
