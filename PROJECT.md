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
- The first local backend slice now exists: Node SQLite/WAL persistence, FTS5, single-owner scrypt authentication and hashed sessions, versioned core APIs, durable jobs, a schema-bound Codex worker, and a Bubblewrap-isolated compiler. Frontend core state hydrates from and mirrors to the API when authenticated, while retaining browser-local fallback. Offline queue, uploads, integrations, approval/apply, production hardening, and deployment remain.
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
