#!/usr/bin/env bash
# Deploy Noema to the Oracle box by syncing source and building ON the host.
# Never ship a .next built elsewhere: webpack bakes absolute import.meta.url
# source paths into .next/server/chunks and breaks bundled server modules.
# See PROJECT.md "Oracle deployment".
set -euo pipefail
KEY="$HOME/.ssh/oracle_lifeos"
HOST="ubuntu@100.112.185.21"
URL="https://instance-20260702-1842.tail3548c0.ts.net:8444"
SSH=(ssh -F /dev/null -i "$KEY")

rsync -az -e "ssh -F /dev/null -i $KEY" \
  app server public scripts next.config.ts tsconfig.json package.json package-lock.json \
  "$HOST:~/noema/"

"${SSH[@]}" "$HOST" 'export PATH=$HOME/noema/.node-v24.14.0/bin:$PATH && cd ~/noema && rm -rf .next && npm install --no-audit --no-fund --loglevel=error && npm run build'

"${SSH[@]}" "$HOST" 'pm2 restart noema noema-worker'
sleep 4

status="$("${SSH[@]}" "$HOST" "curl -sk -o /dev/null -w '%{http_code}' '$URL/calendar'")"
[ "$status" = "200" ] || { echo "deploy failed: /calendar returned $status"; exit 1; }

leaked="$("${SSH[@]}" "$HOST" "grep -rl \"$(id -un)\" ~/noema/.next/server/chunks 2>/dev/null | wc -l")"
[ "$leaked" = "0" ] || { echo "deploy failed: builder paths leaked into bundle"; exit 1; }

probe="$("${SSH[@]}" "$HOST" "curl -sk '$URL/api/v1/events/x/occurrences?start=2026-08-01T00:00:00Z&end=2026-08-30T00:00:00Z'")"
case "$probe" in
  "{"*) : ;;
  *) echo "deploy failed: API returned non-JSON (check pm2 logs noema)"; exit 1 ;;
esac

echo "deployed OK: source synced, built on host, processes restarted, checks passed"
