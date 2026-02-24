#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AGENTS_DEFAULT="codex,gemini,claude,grok,perplexity"
AGENTS="${1:-$AGENTS_DEFAULT}"

ROUTER_LOG="/tmp/gaing_telegram_router.out"
TUNNEL_LOG="/tmp/gaing_telegram_tunnel.out"
ROUTER_PID_FILE="/tmp/gaing_telegram_router.pid"
TUNNEL_PID_FILE="/tmp/gaing_telegram_tunnel.pid"

cleanup_existing() {
  if [[ -f "$ROUTER_PID_FILE" ]]; then
    kill "$(cat "$ROUTER_PID_FILE")" >/dev/null 2>&1 || true
  fi
  if [[ -f "$TUNNEL_PID_FILE" ]]; then
    kill "$(cat "$TUNNEL_PID_FILE")" >/dev/null 2>&1 || true
  fi
}

cleanup_existing

node src/telegram/index.js >"$ROUTER_LOG" 2>&1 &
ROUTER_PID=$!
echo "$ROUTER_PID" > "$ROUTER_PID_FILE"

cloudflared tunnel --url http://localhost:8080 --no-autoupdate >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo "$TUNNEL_PID" > "$TUNNEL_PID_FILE"

URL=""
for _ in $(seq 1 40); do
  URL=$(rg -o "https://[-a-z0-9]+\.trycloudflare\.com" "$TUNNEL_LOG" -m 1 || true)
  [[ -n "$URL" ]] && break
  sleep 1
done

if [[ -z "$URL" ]]; then
  echo "Failed to discover Cloudflare tunnel URL"
  sed -n '1,120p' "$TUNNEL_LOG" || true
  exit 1
fi

sleep 8

python3 - <<PY
from pathlib import Path
new='$URL'
for fp in ['/home/mega/.omega_keys.env','/home/mega/NEXUS/vault/sys/omega_keys.env','/home/mega/NEXUS/vault/user/omega_keys.env']:
    p=Path(fp)
    if not p.exists():
        continue
    lines=p.read_text().splitlines(); out=[]; found=False
    for ln in lines:
        if ln.startswith('TELEGRAM_WEBHOOK_BASE_URL='):
            out.append('TELEGRAM_WEBHOOK_BASE_URL='+new); found=True
        else:
            out.append(ln)
    if not found:
        out.append('TELEGRAM_WEBHOOK_BASE_URL='+new)
    p.write_text('\n'.join(out).rstrip()+'\n')
    p.chmod(0o600)
print('Updated TELEGRAM_WEBHOOK_BASE_URL to', new)
PY

node scripts/telegram-webhook-provision.js --action set --agents "$AGENTS" --base-url "$URL"
node scripts/telegram-router-smoke-test.js --agents "$AGENTS"

echo ""
echo "Router up"
echo "  URL: $URL"
echo "  Router PID: $ROUTER_PID"
echo "  Tunnel PID: $TUNNEL_PID"
echo ""
echo "Logs:"
echo "  tail -f $ROUTER_LOG"
echo "  tail -f $TUNNEL_LOG"
echo ""
echo "To stop: bash scripts/telegram-router-dev-down.sh"
