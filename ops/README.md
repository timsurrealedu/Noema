# Deployment

Build with `npm ci && npm run build`. Run the web and worker units as an unprivileged `noema` user with `NOEMA_DATA_DIR=/var/lib/noema` in `/etc/noema.env` (mode `0600`). Install `noema.service` and `noema-worker.service` under `/etc/systemd/system`.

For public TLS, replace `noema.example.com` in `Caddyfile`, install it under `/etc/caddy/Caddyfile`, and expose only ports 80/443. For private hosting, keep Noema bound to loopback and run `tailscale serve --bg http://127.0.0.1:3000` instead of Caddy.

Set a unique `NOEMA_BACKUP_KEY` of at least 32 characters. Run `npm run backup` from a systemd timer; it encrypts SQLite with AES-256-GCM, verifies the result, and enforces `NOEMA_BACKUP_RETENTION`. Test any archive with `npm run verify:backup -- /path/to/file.noema-backup`.
