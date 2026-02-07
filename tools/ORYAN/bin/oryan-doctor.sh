#!/usr/bin/env bash
set -euo pipefail
echo "=== ORYAN Doctor ==="
for c in git python3 pipx node npm gh codex gemini claude llm aider; do
  printf "%-8s : " "$c"
  command -v "$c" >/dev/null && echo OK || echo MISSING
done
