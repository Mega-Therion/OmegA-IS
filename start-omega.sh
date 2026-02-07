#!/bin/bash
# OmegA-IS unified starter

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Starting OmegA-IS..."

echo "- OmegA-UI: apps/OmegA-UI"
echo "- OmegA-AI: services/OmegA-AI"
echo "- Trinity: services/trinity"

cat <<'MSG'

Choose a component and run its README instructions, for example:

  cd apps/OmegA-UI && npm install && npm run dev
  cd services/OmegA-AI && npm install && npm run dev
  cd services/trinity && npm install && npm run dev

MSG
