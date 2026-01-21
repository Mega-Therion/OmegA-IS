#!/bin/bash
#
# OMEGA Brain Startup Script
# Launches the complete OMEGA ecosystem
#

# Load configuration
if [[ -f "/etc/omega/config" ]]; then
    source /etc/omega/config
fi

# Defaults
OMEGA_ROOT="${OMEGA_ROOT:-/opt/omega-brain}"
OMEGA_API_PORT="${OMEGA_API_PORT:-8080}"
JARVIS_PORT="${JARVIS_PORT:-3001}"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${CYAN}[OMEGA]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

# Banner
echo -e "${CYAN}"
cat << 'EOF'
    ____  __  _______________    ___    ____  ____  ___    _____   __
   / __ \/  |/  / ____/ ____/   /   |  / __ )/ __ \/   |  /  _/ | / /
  / / / / /|_/ / __/ / / __    / /| | / __  / /_/ / /| |  / //  |/ / 
 / /_/ / /  / / /___/ /_/ /   / ___ |/ /_/ / _, _/ ___ |_/ // /|  /  
 \____/_/  /_/_____/\____/   /_/  |_/_____/_/ |_/_/  |_/___/_/ |_/   
                                                                     
EOF
echo -e "${NC}"

# Check if already running
if pgrep -f "node.*${OMEGA_ROOT}/index.js" > /dev/null; then
    log "OMEGA Brain is already running"
    log "  Backend: http://localhost:${OMEGA_API_PORT}"
    log "  Jarvis:  http://localhost:${JARVIS_PORT}"
    exit 0
fi

# Start backend server
log "Starting OMEGA Brain backend..."
cd "$OMEGA_ROOT"

if [[ -f "package.json" ]]; then
    npm start > /var/log/omega-brain.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > /var/run/omega-brain.pid
    success "Backend started (PID: $BACKEND_PID)"
else
    log "Backend not found at $OMEGA_ROOT"
fi

# Wait for backend
log "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s "http://localhost:${OMEGA_API_PORT}/health" > /dev/null 2>&1; then
        success "Backend is ready!"
        break
    fi
    sleep 1
done

# Start Jarvis frontend
if [[ -d "${OMEGA_ROOT}/Jarvis" ]]; then
    log "Starting Jarvis interface..."
    cd "${OMEGA_ROOT}/Jarvis"
    npm run dev > /var/log/jarvis.log 2>&1 &
    JARVIS_PID=$!
    echo $JARVIS_PID > /var/run/jarvis.pid
    success "Jarvis started (PID: $JARVIS_PID)"
fi

# Wait for Jarvis
log "Waiting for Jarvis to be ready..."
for i in {1..30}; do
    if curl -s "http://localhost:${JARVIS_PORT}" > /dev/null 2>&1; then
        success "Jarvis is ready!"
        break
    fi
    sleep 1
done

# Open browser (if in desktop environment)
if [[ -n "$DISPLAY" ]]; then
    log "Opening browser..."
    xdg-open "http://localhost:${JARVIS_PORT}" 2>/dev/null &
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}           OMEGA Brain is now running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Backend API:  http://localhost:${OMEGA_API_PORT}"
echo "  Jarvis UI:    http://localhost:${JARVIS_PORT}"
echo "  Logs:         /var/log/omega-brain.log"
echo ""
echo "CLI Commands:"
echo "  omega status          - Check system status"
echo "  omega chat \"message\" - Chat with agents"
echo "  omega agents          - List available agents"
echo ""
echo "To stop: pkill -f omega-brain"
echo ""
