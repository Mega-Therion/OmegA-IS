#!/usr/bin/env bash
set -euo pipefail

VENV_BIN="/home/mega/.venvs/omega-voice/bin"
PY="$VENV_BIN/python"

if [[ ! -x "$PY" ]]; then
  echo "Venv not found at $VENV_BIN. Run setup first." >&2
  exit 1
fi

OMEGA_API_URL="${OMEGA_API_URL:-http://localhost:8081}" \
OMEGA_STT_MODEL="${OMEGA_STT_MODEL:-tiny}" \
OMEGA_AUDIO_DEVICE="${OMEGA_AUDIO_DEVICE:-default}" \
"$PY" /home/mega/NEXUS/OmegA/OmegA-SI/services/trinity/packages/brain/scripts/omega-voice-vad.py
