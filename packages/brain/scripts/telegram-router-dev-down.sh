#!/usr/bin/env bash
set -euo pipefail

ROUTER_PID_FILE="/tmp/gaing_telegram_router.pid"
TUNNEL_PID_FILE="/tmp/gaing_telegram_tunnel.pid"

for f in "$ROUTER_PID_FILE" "$TUNNEL_PID_FILE"; do
  if [[ -f "$f" ]]; then
    PID="$(cat "$f")"
    kill "$PID" >/dev/null 2>&1 || true
    rm -f "$f"
    echo "stopped pid $PID"
  fi
done

echo "done"
