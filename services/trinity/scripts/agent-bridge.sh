#!/usr/bin/env bash
set -euo pipefail

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
SUMMARY_SCRIPT="${SUMMARY_SCRIPT:-/home/mega/NEXUS/repos/OMEGA-Trinity/scripts/agent-summary.py}"
SUMMARY_OUT="${SUMMARY_OUT:-/var/lib/omega/last_summary.md}"

case "${1:-}" in
  register)
    name="${2:-}"; pid="${3:-}"; cwd="${4:-}"; log="${5:-}"; shift 5 || true
    [[ -z "${name}" || -z "${pid}" || -z "${cwd}" || -z "${log}" ]] && {
      echo "usage: $0 register <name> <pid> <cwd> <log>" >&2; exit 2; }
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" HSET "agent:${name}" \
      pid "$pid" cwd "$cwd" log "$log" last_ts "$(date -Is)" status "running" >/dev/null
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SADD "agents:active" "$name" >/dev/null
    ;;
  stopped)
    name="${2:-}"; shift 2 || true
    [[ -z "${name}" ]] && { echo "usage: $0 stopped <name>" >&2; exit 2; }
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" HSET "agent:${name}" \
      status "stopped" last_ts "$(date -Is)" >/dev/null
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SREM "agents:active" "$name" >/dev/null
    ;;
  summarize)
    python3 "$SUMMARY_SCRIPT" --redis-host "$REDIS_HOST" --redis-port "$REDIS_PORT" \
      --out "$SUMMARY_OUT"
    ;;
  cleanup)
    python3 "$SUMMARY_SCRIPT" --redis-host "$REDIS_HOST" --redis-port "$REDIS_PORT" \
      --cleanup-stale
    ;;
  *)
    echo "usage: $0 {register|stopped|summarize|cleanup} ..." >&2
    exit 2
    ;;
esac
