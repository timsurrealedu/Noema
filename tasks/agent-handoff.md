# Agent handoff — deploy Noema to Oracle

## User goal

Deploy Noema to the existing Oracle/Tailscale box, then return a working Tailscale HTTPS link. After that, set up Google OAuth and connect the user’s Obsidian vault for `td522637@gmail.com`.

## Completed

- `b054479` — OpenRouter free fallback for Fast/Balanced/Quality; invited Google accounts get a private `My workspace` plus invited shared workspace.
- `0632883` — capture tasks create linked calendar events/reminders; vault asset support.
- `af65435` — Oracle access/deployment facts in `PROJECT.md`.
- `npm run test:backend` passed: 105 tests.
- Oracle capacity verified: 2 ARM cores, 7.7 GiB RAM (6.5 GiB available), 45 GiB disk (30 GiB free). No swap.

## Oracle access (do not print private key)

```bash
ssh -i ~/.ssh/oracle_lifeos ubuntu@100.112.185.21
```

- Tailscale DNS: `instance-20260702-1842.tail3548c0.ts.net`
- User: `ubuntu`; architecture: `aarch64`; Node: `v20.20.2`.
- Existing lifeOS PM2 service uses port `7777`; do not alter it.
- Tailscale Serve on HTTPS `443` proxies lifeOS; Funnel uses `8443` → port `80`.
- Intended isolated Noema service: PM2 name `noema`, `127.0.0.1:3107`, Tailscale HTTPS `8444` → `http://127.0.0.1:3107`.
- Planned test link: `https://instance-20260702-1842.tail3548c0.ts.net:8444`.

## Deployment blocker

Do not deploy until `npm run build` completes successfully. Current `npx tsc --noEmit` fails on existing frontend issues:

- `app/calendar/page.tsx:125` — `SyncStatus.writes` missing.
- `app/calendar/page.tsx:507` — `Task.time` missing.
- `app/coding/compiler/page.tsx:344,655` — duplicate function implementation.
- `app/coding/compiler/page.tsx:388` — `KeyboardEvent.isComposing` typing issue.

Fix these minimally, test, then run `npm run build` locally before transfer.

## Deployment steps after build is green

1. Confirm `/home/ubuntu/noema` is absent or back it up; do not touch `/home/ubuntu/lifeOS`.
2. Transfer the committed source archive (not `.env.local` or `.data`) to `/home/ubuntu/noema`.
3. On Oracle: `npm ci`, create owner-only `/home/ubuntu/noema/.env.local` (mode `600`), then `npm run build`.
4. Start with PM2: `pm2 start npm --name noema -- start -- -p 3107`; `pm2 save`.
5. Configure a separate Serve listener: `tailscale serve --https=8444 --bg http://127.0.0.1:3107` (verify it does not modify existing 443/8443 routes).
6. Smoke-test locally and at the HTTPS Tailscale URL. Check `pm2 logs noema`, `tailscale serve status`, and rollback with `pm2 delete noema` plus `tailscale serve clear --https=8444` if needed.

## Authentication / vault follow-up

- Google OAuth cannot be fully configured until the user creates a Google Cloud **Web application** client and supplies `NOEMA_GOOGLE_CLIENT_ID`, `NOEMA_GOOGLE_CLIENT_SECRET`, and `NOEMA_GOOGLE_LOGIN_REDIRECT_URI` (production callback: `https://<public-or-tailnet-domain>/api/v1/auth/google/callback`; determine whether Google accepts the Tailscale name for the desired consent-screen mode).
- Login policy is invited-only: `td522637@gmail.com` must be owner or receive an active workspace invite. First Google login creates private `My workspace` and accepts invited shared workspace(s).
- Vault is workspace-scoped, not directly Google-account-scoped. Local vault exists at `/home/timsurreal/Documents/Obsidian Vault`; Oracle already has `/home/ubuntu/Obsidian Vault`. Use Syncthing to keep them aligned, then connect the Oracle path in the user’s private Noema workspace after deployment.
