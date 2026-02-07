#!/usr/bin/env bash
# 🌴⚡🌆 OMEGA WEBSITE SYNCHRONIZER
set -euo pipefail

# YOU MUST PASTE YOUR ZAPIER WEBHOOK URL HERE
ZAPIER_URL="${OMEGA_ZAPIER_WEBHOOK_URL:-}"

if [[ -z "$ZAPIER_URL" ]]; then
  echo "Error: OMEGA_ZAPIER_WEBHOOK_URL is not set."
  echo "Please create a Zapier Webhook trigger and export the URL."
  exit 1
fi

AGENT_NAME="${1:-Claude}"
TASK_TITLE="${2:-Website Expansion Initialization}"

echo "🚀 [OMEGA] Synchronizing Web Skin via Zapier..."

PAYLOAD=$(cat <<EOF
{
  "agent_name": "$AGENT_NAME",
  "task_id": "WS-$(date +%s)",
  "task_type": "WEB_SYNC",
  "payload": {
    "title": "$TASK_TITLE",
    "content": "Automated deployment of the Sovereign Web Interface initiated by $AGENT_NAME.",
    "theme": "MIAMI_VICE",
    "priority": "HIGH"
  },
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

curl -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$ZAPIER_URL"

echo "✅ [OMEGA] Sync signal sent to Zapier."
