# LifeOS v2

Personal-first, self-hosted LifeOS for capture, tasks, scheduling, knowledge, study, coding, and automations. The frontend is a responsive Next.js PWA; the local backend uses SQLite, authenticated APIs, durable jobs, isolated Codex execution, and a Bubblewrap compiler.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set a strong `LIFEOS_OWNER_PASSWORD` in `.env.local`. Backend features are disabled unless their environment flags are enabled.

Optional fallbacks: set `GEMINI_API_KEY` from Google AI Studio and/or `OPENAI_API_KEY`. The order is Codex → Gemini → OpenAI on explicit capacity/quota exhaustion. OpenAI routes simple tasks and schedules to `chat-latest`, notes and code to `gpt-5.6` with low reasoning, and math/research to `gpt-5.6` with medium reasoning. Override these with `LIFEOS_GEMINI_MODEL`, `LIFEOS_OPENAI_FAST_MODEL`, and `LIFEOS_OPENAI_REASONING_MODEL`.

## Verification

```bash
npm test
npm run build
```

See [BACKEND_DESIGN.md](BACKEND_DESIGN.md), [BACKEND_ROADMAP.md](BACKEND_ROADMAP.md), and [FRONTEND_ROADMAP.md](FRONTEND_ROADMAP.md).
