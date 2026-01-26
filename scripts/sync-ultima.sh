#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_ROOT="${1:-/home/mega/OmegaUltima}"

if [[ ! -d "$SRC_ROOT" ]]; then
  echo "Source folder not found: $SRC_ROOT" >&2
  exit 1
fi

mkdir -p "$REPO_ROOT/docs/ultima/analysis" \
  "$REPO_ROOT/docs/ultima/architecture" \
  "$REPO_ROOT/docs/ultima/progress" \
  "$REPO_ROOT/docs/ultima/summaries" \
  "$REPO_ROOT/prototypes/orchestrator"

copy_if_exists() {
  local src="$1"
  local dest_dir="$2"
  if [[ -f "$src" ]]; then
    cp "$src" "$dest_dir/"
    echo "Synced: $src"
  else
    echo "Missing: $src" >&2
  fi
}

copy_if_exists "$SRC_ROOT/CAPABILITY_GAP_ANALYSIS.md" "$REPO_ROOT/docs/ultima/analysis"
copy_if_exists "$SRC_ROOT/OMEGA_ULTIMA_ARCHITECTURE.md" "$REPO_ROOT/docs/ultima/architecture"
copy_if_exists "$SRC_ROOT/PHASE2_PROGRESS_JAN25.md" "$REPO_ROOT/docs/ultima/progress"
copy_if_exists "$SRC_ROOT/IMPLEMENTATION_SUMMARY_JAN25.md" "$REPO_ROOT/docs/ultima/summaries"
copy_if_exists "$SRC_ROOT/omega_orchestrator.py" "$REPO_ROOT/prototypes/orchestrator"

cat <<'NOTE'
Done. If you added new OmegaUltima docs, edit scripts/sync-ultima.sh to include them.
NOTE
