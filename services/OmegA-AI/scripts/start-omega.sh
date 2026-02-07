#!/bin/bash

# Project Omega Unified Startup Script
# Starts both backend and frontend in development mode

set -e

echo "========================================="
echo "  Starting Project Omega"
echo "========================================="
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please configure your .env file with API keys${NC}"
    echo ""
fi

# Function to kill child processes on exit
cleanup() {
    echo ""
    echo "Shutting down Project Omega..."
    kill 0
}
trap cleanup EXIT

# Start backend
echo -e "${GREEN}Starting backend server...${NC}"
npm start &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend failed to start. Check logs above."
    exit 1
fi

echo -e "${GREEN}✓ Backend running on http://localhost:8080${NC}"
echo ""

# Start frontend
echo -e "${GREEN}Starting frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "========================================="
echo -e "${GREEN}  Project Omega is running!${NC}"
echo "========================================="
echo ""
echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
