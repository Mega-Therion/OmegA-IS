#!/bin/bash
# =============================================================================
# OMEGA Trinity - Unified Startup Script
# =============================================================================
#
# This script starts all three components of the OMEGA Trinity:
# - HUD (Frontend):  Next.js on port 3000
# - Brain (Backend): Node.js on port 8080
# - Bridge (Consensus): Python FastAPI on port 8000
#
# Usage:
#   ./scripts/omega-start.sh          # Start all services
#   ./scripts/omega-start.sh hud      # Start only HUD
#   ./scripts/omega-start.sh brain    # Start only Brain
#   ./scripts/omega-start.sh bridge   # Start only Bridge
#   ./scripts/omega-start.sh --help   # Show help
#
# Environment:
#   OMEGA_HUD_PORT      HUD port (default: 3000)
#   OMEGA_BRAIN_PORT    Brain port (default: 8080)
#   OMEGA_BRIDGE_PORT   Bridge port (default: 8000)
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ports
HUD_PORT=${OMEGA_HUD_PORT:-3000}
BRAIN_PORT=${OMEGA_BRAIN_PORT:-8080}
BRIDGE_PORT=${OMEGA_BRIDGE_PORT:-8000}

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗               ║"
    echo "║  ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗              ║"
    echo "║  ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║              ║"
    echo "║  ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║              ║"
    echo "║  ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║              ║"
    echo "║   ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝              ║"
    echo "║                                                               ║"
    echo "║              T R I N I T Y   S Y S T E M                     ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_help() {
    echo "OMEGA Trinity Startup Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  all       Start all services (default)"
    echo "  hud       Start only HUD (Next.js frontend)"
    echo "  brain     Start only Brain (Node.js backend)"
    echo "  bridge    Start only Bridge (Python FastAPI)"
    echo "  stop      Stop all services"
    echo "  status    Check status of all services"
    echo "  --help    Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  OMEGA_HUD_PORT      HUD port (default: 3000)"
    echo "  OMEGA_BRAIN_PORT    Brain port (default: 8080)"
    echo "  OMEGA_BRIDGE_PORT   Bridge port (default: 8000)"
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

wait_for_service() {
    local name=$1
    local port=$2
    local max_wait=${3:-30}
    local waited=0

    echo -e "${YELLOW}Waiting for $name on port $port...${NC}"
    while ! check_port $port && [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))
    done

    if check_port $port; then
        echo -e "${GREEN}✓ $name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}✗ $name failed to start on port $port${NC}"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Service Management
# -----------------------------------------------------------------------------

start_hud() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🎨 Starting HUD (Perception Layer)...${NC}"
    cd "$PROJECT_ROOT/packages/hud"

    if check_port $HUD_PORT; then
        echo -e "${YELLOW}⚠ HUD already running on port $HUD_PORT${NC}"
        return 0
    fi

    # Start in background
    PORT=$HUD_PORT npm run dev > "$PROJECT_ROOT/logs/hud.log" 2>&1 &
    echo $! > "$PROJECT_ROOT/logs/hud.pid"
    echo -e "${GREEN}✓ HUD started (PID: $(cat "$PROJECT_ROOT/logs/hud.pid"))${NC}"
}

start_brain() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧠 Starting Brain (Cognition Layer)...${NC}"
    cd "$PROJECT_ROOT/packages/brain"

    if check_port $BRAIN_PORT; then
        echo -e "${YELLOW}⚠ Brain already running on port $BRAIN_PORT${NC}"
        return 0
    fi

    # Start in background
    PORT=$BRAIN_PORT npm run start > "$PROJECT_ROOT/logs/brain.log" 2>&1 &
    echo $! > "$PROJECT_ROOT/logs/brain.pid"
    echo -e "${GREEN}✓ Brain started (PID: $(cat "$PROJECT_ROOT/logs/brain.pid"))${NC}"
}

start_bridge() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🌉 Starting Bridge (Consensus Layer)...${NC}"
    cd "$PROJECT_ROOT/packages/bridge"

    if check_port $BRIDGE_PORT; then
        echo -e "${YELLOW}⚠ Bridge already running on port $BRIDGE_PORT${NC}"
        return 0
    fi

    # Check Python environment
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗ Python 3 not found. Please install Python 3.${NC}"
        return 1
    fi

    # Install requirements if needed
    if [ -f "requirements.txt" ]; then
        pip3 install -q -r requirements.txt 2>/dev/null || true
    fi

    # Start in background
    PORT=$BRIDGE_PORT python3 -m uvicorn api:app --host 0.0.0.0 --port $BRIDGE_PORT > "$PROJECT_ROOT/logs/bridge.log" 2>&1 &
    echo $! > "$PROJECT_ROOT/logs/bridge.pid"
    echo -e "${GREEN}✓ Bridge started (PID: $(cat "$PROJECT_ROOT/logs/bridge.pid"))${NC}"
}

stop_service() {
    local name=$1
    local pidfile="$PROJECT_ROOT/logs/${name}.pid"

    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo -e "${GREEN}✓ Stopped $name (PID: $pid)${NC}"
        fi
        rm -f "$pidfile"
    fi
}

stop_all() {
    echo -e "${YELLOW}Stopping all OMEGA services...${NC}"
    stop_service "hud"
    stop_service "brain"
    stop_service "bridge"
    echo -e "${GREEN}✓ All services stopped${NC}"
}

show_status() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}OMEGA Trinity Status${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # HUD Status
    if check_port $HUD_PORT; then
        echo -e "${GREEN}🎨 HUD:    ✓ Running on port $HUD_PORT${NC}"
    else
        echo -e "${RED}🎨 HUD:    ✗ Not running${NC}"
    fi

    # Brain Status
    if check_port $BRAIN_PORT; then
        echo -e "${GREEN}🧠 Brain:  ✓ Running on port $BRAIN_PORT${NC}"
    else
        echo -e "${RED}🧠 Brain:  ✗ Not running${NC}"
    fi

    # Bridge Status
    if check_port $BRIDGE_PORT; then
        echo -e "${GREEN}🌉 Bridge: ✓ Running on port $BRIDGE_PORT${NC}"
    else
        echo -e "${RED}🌉 Bridge: ✗ Not running${NC}"
    fi

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Show URLs
    if check_port $HUD_PORT; then
        echo -e "${BLUE}HUD Dashboard:${NC}    http://localhost:$HUD_PORT"
    fi
    if check_port $BRAIN_PORT; then
        echo -e "${BLUE}Brain API:${NC}        http://localhost:$BRAIN_PORT/health"
    fi
    if check_port $BRIDGE_PORT; then
        echo -e "${BLUE}Bridge API:${NC}       http://localhost:$BRIDGE_PORT/docs"
    fi
}

start_all() {
    print_banner

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    echo -e "${PURPLE}Starting OMEGA Trinity...${NC}"
    echo ""

    # Start services
    start_bridge
    start_brain
    start_hud

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Wait for services
    sleep 3

    echo ""
    show_status

    echo ""
    echo -e "${GREEN}OMEGA Trinity is starting up!${NC}"
    echo -e "${YELLOW}Check logs in: $PROJECT_ROOT/logs/${NC}"
    echo ""
    echo -e "${PURPLE}Press Ctrl+C to stop viewing, use 'omega:stop' to stop services${NC}"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

cd "$PROJECT_ROOT"

case "${1:-all}" in
    all)
        start_all
        ;;
    hud)
        mkdir -p "$PROJECT_ROOT/logs"
        start_hud
        ;;
    brain)
        mkdir -p "$PROJECT_ROOT/logs"
        start_brain
        ;;
    bridge)
        mkdir -p "$PROJECT_ROOT/logs"
        start_bridge
        ;;
    stop)
        stop_all
        ;;
    status)
        show_status
        ;;
    --help|-h)
        print_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        print_help
        exit 1
        ;;
esac
