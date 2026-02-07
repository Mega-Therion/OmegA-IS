#!/usr/bin/env bash
set -euo pipefail

# Assumption: the Codex CLI supports non-interactive usage via `codex exec [PROMPT]`.
prompt="${ORYAN_PROMPT:-${1:-}}"
if [[ -z "$prompt" ]]; then
  echo "No prompt provided." >&2
  exit 2
fi

if command -v codex >/dev/null 2>&1; then
  codex exec --skip-git-repo-check "$prompt"
else
  echo "codex CLI not found in PATH." >&2
  exit 127
fi
