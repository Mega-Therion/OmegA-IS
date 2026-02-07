#!/bin/bash
#
# OMEGA-OS Backup Script
# Backs up user data and configuration to persistence or external storage
#

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${CYAN}[BACKUP]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1" >&2; }

# Default backup location
BACKUP_DIR="${1:-/home/omega/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="omega-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Items to backup
BACKUP_ITEMS=(
    "/etc/omega"
    "/home/omega/.config"
    "/opt/omega-brain/.env"
    "/opt/omega-brain/data"
    "/opt/omega-brain/uploads"
    "/opt/omega-brain/log.md"
)

echo -e "${CYAN}"
echo "╔════════════════════════════════════════╗"
echo "║       OMEGA-OS Backup Utility          ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Create backup directory
mkdir -p "$BACKUP_PATH"
log "Backup location: $BACKUP_PATH"

# Backup each item
for item in "${BACKUP_ITEMS[@]}"; do
    if [[ -e "$item" ]]; then
        log "Backing up: $item"
        
        # Create parent directory structure
        parent_dir=$(dirname "$item")
        mkdir -p "${BACKUP_PATH}${parent_dir}"
        
        # Copy
        cp -r "$item" "${BACKUP_PATH}${item}" 2>/dev/null || true
        success "Done: $item"
    else
        warn "Skipped (not found): $item"
    fi
done

# Create archive
log "Creating archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

# Cleanup old backups (keep last 5)
log "Cleaning up old backups..."
ls -t "$BACKUP_DIR"/omega-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

# Summary
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                   Backup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo ""
echo "To restore: tar -xzf ${BACKUP_NAME}.tar.gz -C /"
echo ""
