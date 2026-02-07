#!/bin/bash

# Project Omega Frontend Setup Script
# Sets up the React frontend with all dependencies

set -e  # Exit on error

echo "========================================="
echo "  Project Omega Frontend Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}Node.js version is too old. Please upgrade to Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

echo -e "${BLUE}Installing frontend dependencies...${NC}"
npm install

echo ""
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    cat > .env << 'EOF'
# Frontend environment variables
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}  Frontend Setup Complete!${NC}"
echo "========================================="
echo ""
echo "To start the frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Or use the integrated startup script:"
echo "  npm run omega"
echo ""
