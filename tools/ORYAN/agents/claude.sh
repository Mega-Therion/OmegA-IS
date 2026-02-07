#!/usr/bin/env bash
set -euo pipefail

# Assumption: the Claude CLI supports --print for non-interactive usage.
prompt="${ORYAN_PROMPT:-${1:-}}"
if [[ -z "$prompt" ]]; then
  echo "No prompt provided." >&2
  exit 2
fi

if command -v claude >/dev/null 2>&1; then
  claude --print "$prompt"
else
  echo "claude CLI not found in PATH." >&2
  exit 127
fi
