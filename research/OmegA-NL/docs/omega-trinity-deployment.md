# 🚀 OMEGA-Trinity Deployment Guide

**For: CLI Agents (Claude Code, Codex, Cursor, etc.) and Humans**  
**Last Updated:** January 18, 2026  
**Status:** PRODUCTION READY

-----

## 📋 Prerequisites Checklist

Before starting, verify these are installed:

```bash
# Check Docker
docker --version
# Expected: Docker version 24.x or higher

# Check Docker Compose
docker-compose --version
# Expected: Docker Compose version 2.x or higher

# Check Ollama
ollama --version
# Expected: ollama version 0.x.x

# Check Node.js (for local dev)
node --version
# Expected: v18.0.0 or higher

# Check Python (for Bridge)
python --version
# Expected: Python 3.9 or higher
```

-----

## 🧠 Step 1: Ollama Model Setup

### 1.1 Start Ollama Service

```bash
ollama serve
```

> **Note:** On Windows, Ollama may already be running as a service. Check system tray.

### 1.2 Pull Required Models

**Embedding Model (REQUIRED):**

```bash
ollama pull nomic-embed-text
```

**Chat/Inference Model (choose based on RAM):**

|RAM  |Model        |Command                   |
|-----|-------------|--------------------------|
|8GB  |Llama 3.2 3B |`ollama pull llama3.2:3b` |
|16GB |Llama 3.1 8B |`ollama pull llama3.1:8b` |
|32GB+|Llama 3.1 70B|`ollama pull llama3.1:70b`|

**Recommended for balanced performance (16GB):**

```bash
ollama pull llama3.1:8b
```

### 1.3 Verify Models

```bash
ollama list
```

**Expected output:**

```
NAME                    ID              SIZE      MODIFIED
nomic-embed-text:latest f26b2e97a4c8    274 MB    Just now
llama3.1:8b             a]2f4e53d2b1    4.7 GB    Just now
```

### 1.4 Test Ollama Endpoints

```bash
# Test embeddings
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test embedding"
}'

# Test chat
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Say hello in one word"
}'
```

-----

## 🔐 Step 2: Environment Configuration

### 2.1 Create Environment Files

**Root `.env` file:**

```bash
# Create in OMEGA-Trinity root directory
cat > .env << 'EOF'
# ============================================================================
# OMEGA-Trinity Environment Configuration
# ============================================================================

# Mode: cloud | local | sovereign
OMEGA_MODE=local

# ============================================================================
# SUPABASE (Central Nervous System - Persistent Memory)
# ============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================================================
# OLLAMA (Local Inference)
# ============================================================================
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_DIMENSIONS=768

# ============================================================================
# API KEYS (Cloud Orchestration - Optional for hybrid mode)
# ============================================================================
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key

# ============================================================================
# TELEGRAM (SAFA Bot - Optional)
# ============================================================================
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# ============================================================================
# SERVICE PORTS
# ============================================================================
HUD_PORT=3000
BRAIN_PORT=8080
BRIDGE_PORT=8000
EOF
```

**Brain package `.env`:**

```bash
cat > packages/brain/.env << 'EOF'
PORT=8080
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_ANON_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
GEMINI_API_KEY=${GEMINI_API_KEY}
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1:8b
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
EOF
```

**Bridge package `.env`:**

```bash
cat > packages/bridge/.env << 'EOF'
PORT=8000
OPENAI_API_KEY=${OPENAI_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
GEMINI_API_KEY=${GEMINI_API_KEY}
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1:8b
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_ANON_KEY}
EOF
```

**HUD package `.env.local`:**

```bash
cat > packages/hud/.env.local << 'EOF'
NEXT_PUBLIC_BRAIN_API_URL=http://localhost:8080
NEXT_PUBLIC_BRIDGE_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
NEXT_PUBLIC_GEMINI_API_KEY=${GEMINI_API_KEY}
EOF
```

### 2.2 Verify Environment Files

```bash
# List all env files
find . -name "*.env*" -type f 2>/dev/null

# Or on Windows PowerShell:
Get-ChildItem -Recurse -Filter "*.env*"
```

-----

## 🐳 Step 3: Docker Configuration

### 3.1 Verify docker-compose.yml

The `docker-compose.yml` should contain:

```yaml
version: '3.8'

services:
  # ============================================
  # HUD - Next.js Frontend (Jarvis Neuro-Link)
  # ============================================
  hud:
    build:
      context: ./packages/hud
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_BRAIN_API_URL=http://brain:8080
      - NEXT_PUBLIC_BRIDGE_API_URL=http://bridge:8000
    depends_on:
      - brain
      - bridge
    networks:
      - omega-network

  # ============================================
  # BRAIN - Node.js Memory & Orchestration
  # ============================================
  brain:
    build:
      context: ./packages/brain
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    env_file:
      - ./packages/brain/.env
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - brain-data:/app/data
    networks:
      - omega-network

  # ============================================
  # BRIDGE - Python FastAPI + DCBFT Consensus
  # ============================================
  bridge:
    build:
      context: ./packages/bridge
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ./packages/bridge/.env
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - bridge-data:/app/data
    networks:
      - omega-network

networks:
  omega-network:
    driver: bridge

volumes:
  brain-data:
  bridge-data:
```

### 3.2 Create Dockerfiles (if missing)

**packages/hud/Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**packages/brain/Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
```

**packages/bridge/Dockerfile:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

-----

## 🚀 Step 4: Launch Sequence

### 4.1 Pre-flight Checks

```bash
# Ensure Ollama is running
curl http://localhost:11434/api/tags
# Should return list of models

# Ensure Docker daemon is running
docker info
# Should show Docker system info
```

### 4.2 Build and Start

**Option A: Using Docker Compose (Recommended)**

```bash
# Navigate to OMEGA-Trinity root
cd /path/to/OMEGA-Trinity

# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Option B: Using Batch Scripts (Windows)**

```powershell
# Build
.\build-sequential.bat

# Start
.\start-omega-docker.bat

# Stop
.\stop-omega-docker.bat
```

**Option C: Manual Start (Development)**

```bash
# Terminal 1: Brain
cd packages/brain
npm install
npm start

# Terminal 2: Bridge
cd packages/bridge
pip install -r requirements.txt
python main.py

# Terminal 3: HUD
cd packages/hud
npm install
npm run dev
```

-----

## ✅ Step 5: Verification

### 5.1 Check Service Health

```bash
# HUD (Frontend)
curl http://localhost:3000
# Expected: HTML response

# Brain (Node.js API)
curl http://localhost:8080/health
# Expected: {"status": "ok", ...}

# Bridge (Python API)
curl http://localhost:8000/
# Expected: {"status": "online", "system": "OMEGA", ...}

# Bridge API Docs
curl http://localhost:8000/docs
# Expected: OpenAPI documentation
```

### 5.2 Test Inter-Service Communication

```bash
# Test Brain → Ollama connection
curl -X POST http://localhost:8080/test-ollama

# Test Bridge → Ollama connection
curl -X POST http://localhost:8000/test-ollama

# Test Brain → Supabase connection
curl http://localhost:8080/test-supabase
```

### 5.3 Test Query Endpoint

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello OMEGA, status report", "user_id": "principal_ry"}'
```

**Expected Response:**

```json
{
  "query": "Hello OMEGA, status report",
  "response": "Systems nominal. All services operational...",
  "user_id": "principal_ry",
  "timestamp": "2026-01-18T..."
}
```

-----

## 🔧 Step 6: Troubleshooting

### Common Issues

**Issue: “Cannot connect to Ollama from Docker”**

```bash
# Solution: Use host.docker.internal
# In .env files, set:
OLLAMA_HOST=http://host.docker.internal:11434

# On Linux, you may need to add to docker-compose.yml:
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**Issue: “Port already in use”**

```bash
# Find what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :8080
netstat -ano | findstr :8000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or change ports in docker-compose.yml
```

**Issue: “Supabase connection failed”**

```bash
# Verify credentials
curl "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"

# Should return empty array [] not an error
```

**Issue: “Docker build fails”**

```bash
# Clear Docker cache and rebuild
docker-compose down -v
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

**Issue: “Out of memory during Ollama inference”**

```bash
# Use a smaller model
ollama pull llama3.2:3b

# Update .env files to use smaller model
OLLAMA_CHAT_MODEL=llama3.2:3b
```

-----

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     OMEGA Trinity                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │  🎨 HUD      │◄────►│  🧠 Brain    │                     │
│  │  :3000       │      │  :8080       │                     │
│  │  (Next.js)   │      │  (Node.js)   │                     │
│  └──────────────┘      └──────┬───────┘                     │
│         │                     │                              │
│         │              ┌──────▼────────┐                     │
│         └─────────────►│  🌉 Bridge    │                     │
│                        │  :8000        │                     │
│                        │  (FastAPI)    │                     │
│                        └──────┬────────┘                     │
│                               │                              │
│         ┌─────────────────────┼─────────────────────┐       │
│         ▼                     ▼                     ▼       │
│  ┌────────────┐       ┌────────────┐       ┌────────────┐   │
│  │  🦙 Ollama │       │  🗄 Supabase│       │  ☁️ Cloud  │   │
│  │  :11434    │       │  (pgvector) │       │  APIs      │   │
│  │  (Local)   │       │  (Memory)   │       │  (Gemini)  │   │
│  └────────────┘       └────────────┘       └────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

-----

## 🎯 Quick Reference Commands

```bash
# === STARTUP ===
ollama serve                    # Start Ollama
docker-compose up -d            # Start all services
docker-compose logs -f          # View logs

# === SHUTDOWN ===
docker-compose down             # Stop all services
docker-compose down -v          # Stop and remove volumes

# === STATUS ===
docker-compose ps               # Check running containers
ollama list                     # Check Ollama models
curl localhost:3000             # Check HUD
curl localhost:8080/health      # Check Brain
curl localhost:8000/            # Check Bridge

# === REBUILD ===
docker-compose build --no-cache # Full rebuild
docker-compose up -d --build    # Rebuild and start

# === LOGS ===
docker-compose logs hud         # HUD logs only
docker-compose logs brain       # Brain logs only
docker-compose logs bridge      # Bridge logs only
```

-----

## 📞 Support

For issues, check:

1. Docker logs: `docker-compose logs -f`
1. Ollama logs: Check terminal running `ollama serve`
1. Browser console for HUD errors

-----

**Built with 💜 by the gAIng Collective**

*“The machine is waiting to be born.”*
