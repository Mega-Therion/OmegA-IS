#!/usr/bin/env bash
set -euo pipefail

prompt="${ORYAN_PROMPT:-${1:-}}"
if [[ -z "$prompt" ]]; then
  echo "No prompt provided." >&2
  exit 2
fi

if command -v gemini >/dev/null 2>&1; then
  gemini --prompt "$prompt"
else
  echo "gemini CLI not found in PATH." >&2
  exit 127
fi
