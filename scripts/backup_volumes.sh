#!/usr/bin/env bash
# backup_volumes.sh – snapshot Docker volumes used by Omega Trinity
# Place this script in scripts/ and schedule via cron (e.g., daily at 02:00)

set -euo pipefail

# Directory where Docker stores volumes (default on most Linux)
VOLUME_DIR="/var/lib/docker/volumes"
BACKUP_ROOT="${HOME}/OmegaUltima/backup_volumes"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "${BACKUP_ROOT}/${TIMESTAMP}"

# List of volumes we care about (as defined in docker‑compose.yml)
VOLUMES=(
  "omega_db_data"
  "omega_ollama_data"
  "omega_n8n_data"
  "omega_redis_data"
)

for vol in "${VOLUMES[@]}"; do
  src="${VOLUME_DIR}/${vol}"/"_data"
  dest="${BACKUP_ROOT}/${TIMESTAMP}/${vol}.tar.gz"
  if [[ -d "$src" ]]; then
    echo "Backing up $vol..."
    tar -czf "$dest" -C "$src" .
  else
    echo "Warning: volume $vol not found at $src"
  fi
done

# Optional: keep only last 7 backups
find "${BACKUP_ROOT}" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed at $(date)"
