#!/bin/bash
# OMEGA Unified Startup Script
# Starts all services in the correct order with health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        OMEGA System Startup              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

# Function to check if a port is in use
check_port() {
    local port=$1
    if ss -tlnp | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# Function to wait for a service
wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=1

    echo -e "${YELLOW}Waiting for $name...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is ready${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e "${RED}✗ $name failed to start${NC}"
    return 1
}

# Step 1: Check environment
echo -e "\n${BLUE}[1/5] Checking environment...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Environment file found${NC}"

# Step 2: Check if Ollama is running on host
echo -e "\n${BLUE}[2/5] Checking Ollama...${NC}"
if check_port 11434; then
    echo -e "${GREEN}✓ Ollama is running on port 11434${NC}"
else
    echo -e "${YELLOW}Starting Ollama...${NC}"
    ollama serve &
    sleep 3
    if check_port 11434; then
        echo -e "${GREEN}✓ Ollama started${NC}"
    else
        echo -e "${YELLOW}⚠ Ollama not available (LLM will use cloud APIs)${NC}"
    fi
fi

# Step 3: Start Docker services
echo -e "\n${BLUE}[3/5] Starting Docker services...${NC}"
docker compose up -d

# Wait for Docker services
sleep 5
wait_for_service "PostgreSQL" "localhost:5432" 30 || true
wait_for_service "Redis" "localhost:6379" 10 || true
wait_for_service "Gateway" "http://localhost:8787" 30 || true
wait_for_service "N8N" "http://localhost:5678/healthz" 60 || true

# Step 4: Start Brain service
echo -e "\n${BLUE}[4/5] Starting Brain service...${NC}"
if check_port 8080; then
    echo -e "${YELLOW}⚠ Port 8080 already in use, skipping Brain startup${NC}"
else
    cd packages/brain
    npm start &
    BRAIN_PID=$!
    cd "$SCRIPT_DIR"
    sleep 5
    if check_port 8080; then
        echo -e "${GREEN}✓ Brain service started (PID: $BRAIN_PID)${NC}"
    else
        echo -e "${YELLOW}⚠ Brain service may still be starting...${NC}"
    fi
fi

# Step 5: Summary
echo -e "\n${BLUE}[5/5] Startup complete!${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           OMEGA Services Status          ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║ PostgreSQL:  http://localhost:5432       ║${NC}"
echo -e "${GREEN}║ Redis:       http://localhost:6379       ║${NC}"
echo -e "${GREEN}║ Gateway:     http://localhost:8787       ║${NC}"
echo -e "${GREEN}║ Brain:       http://localhost:8080       ║${NC}"
echo -e "${GREEN}║ N8N:         http://localhost:5678       ║${NC}"
echo -e "${GREEN}║ Ollama:      http://localhost:11434      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}To stop all services:${NC}"
echo -e "  docker compose down"
echo -e "  pkill -f 'node index.js'"

echo -e "\n${BLUE}To view logs:${NC}"
echo -e "  docker compose logs -f"
echo -e "  tail -f packages/brain/logs/*.log"
