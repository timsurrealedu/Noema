# Security and recovery acceptance

1. Run `npm test` and `npm run build` on the deployment host.
2. Confirm `/api/v1/health` returns HTTP 200, `database: "ok"`, zero foreign-key errors, and no disk alert.
3. Confirm unauthenticated private APIs return 401, cross-origin mutations return 403, stale writes return 409, and repeated login failures return 429.
4. Set a unique `LIFEOS_BACKUP_KEY` in `/etc/lifeos.env` (mode `0600`), run `npm run backup`, then verify its output with `npm run verify:backup -- <file>` on a second host.
5. Confirm the service account cannot write outside `/var/lib/lifeos`, only the reverse proxy is externally reachable, and secrets never appear in structured logs.
6. Import a disposable v1 export with `npm run import:v1 -- <directory>` and compare note, task, event, attachment, and audit counts before production migration.
