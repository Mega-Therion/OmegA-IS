#!/usr/bin/env bash
set -euo pipefail

VENV_BIN="/home/mega/.venvs/omega-voice/bin"
PY="$VENV_BIN/python"

if [[ ! -x "$PY" ]]; then
  echo "Venv not found at $VENV_BIN. Run setup first." >&2
  exit 1
fi

OUT_WAV="/tmp/omega_in.wav"

# Record until Ctrl+C
if ! command -v arecord >/dev/null 2>&1; then
  echo "arecord not found. Install alsa-utils." >&2
  exit 1
fi

echo "Recording... press Ctrl+C to stop."
arecord -f S16_LE -r 16000 -c 1 "$OUT_WAV"

echo "Transcribing and asking Omega..."
OMEGA_API_URL="${OMEGA_API_URL:-http://localhost:8081}" \
OMEGA_STT_MODEL="${OMEGA_STT_MODEL:-tiny}" \
"$PY" /home/mega/NEXUS/OmegA/OmegA-SI/services/trinity/packages/brain/scripts/omega-voice.py "$OUT_WAV"
