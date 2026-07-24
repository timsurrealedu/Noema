# LifeOS v2

Personal-first, self-hosted LifeOS for capture, tasks, scheduling, knowledge, study, coding, and automations. The frontend is a responsive Next.js PWA; the local backend uses SQLite, authenticated APIs, durable jobs, isolated Codex execution, and a Bubblewrap compiler.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set a strong `LIFEOS_OWNER_PASSWORD` in `.env.local`. Backend features are disabled unless their environment flags are enabled.

## Verification

```bash
npm test
npm run build
```

See [BACKEND_DESIGN.md](BACKEND_DESIGN.md), [BACKEND_ROADMAP.md](BACKEND_ROADMAP.md), and [FRONTEND_ROADMAP.md](FRONTEND_ROADMAP.md).
