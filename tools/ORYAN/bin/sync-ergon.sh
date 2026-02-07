#!/usr/bin/env bash
set -euo pipefail

SRC="/home/mega/ORYAN/ERGON.md"
DEST="/home/mega/OmegaUltima/OMEGA-Trinity/docs/ergon/ERGON.md"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source: $SRC" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp "$SRC" "$DEST"

echo "Synced ERGON.md to OMEGA-Trinity." 
