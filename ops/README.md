# Deployment

Build with `npm ci && npm run build`. Run the web and worker units as an unprivileged `lifeos` user with `LIFEOS_DATA_DIR=/var/lib/lifeos` in `/etc/lifeos.env` (mode `0600`). Install `lifeos.service` and `lifeos-worker.service` under `/etc/systemd/system`.

For public TLS, replace `lifeos.example.com` in `Caddyfile`, install it under `/etc/caddy/Caddyfile`, and expose only ports 80/443. For private hosting, keep LifeOS bound to loopback and run `tailscale serve --bg http://127.0.0.1:3000` instead of Caddy.

Set a unique `LIFEOS_BACKUP_KEY` of at least 32 characters. Run `npm run backup` from a systemd timer; it encrypts SQLite with AES-256-GCM, verifies the result, and enforces `LIFEOS_BACKUP_RETENTION`. Test any archive with `npm run verify:backup -- /path/to/file.lifeos-backup`.
