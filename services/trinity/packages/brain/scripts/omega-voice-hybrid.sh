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
OMEGA_WAKEWORD="${OMEGA_WAKEWORD:-mega}" \
OMEGA_SPK_VERIFY="${OMEGA_SPK_VERIFY:-soft}" \
OMEGA_SPK_THRESHOLD="${OMEGA_SPK_THRESHOLD:-0.62}" \
PYTHONUNBUFFERED=1 \
"$PY" /home/mega/NEXUS/OmegA/OmegA-SI/services/trinity/packages/brain/scripts/omega-voice-hybrid.py \
  --padding-ms "${OMEGA_PADDING_MS:-200}" \
  --silence-ms "${OMEGA_SILENCE_MS:-300}" \
  --max-segment-ms "${OMEGA_MAX_SEGMENT_MS:-8000}"
