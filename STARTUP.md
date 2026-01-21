# 🚀 OMEGA Trinity Startup Guide

## Quick Reference

### Start Everything at Once

```bash
npm run dev
```

### Start Services Individually

#### 🎨 HUD (Frontend Dashboard)

```bash
npm run dev:hud
```

- Opens on: `http://localhost:3000`
- Stack: Next.js + React + TypeScript

#### 🧠 Brain (Memory & Orchestration)

```bash
npm run dev:brain
```

- Opens on: `http://localhost:8080`
- Stack: Node.js + Express + Supabase

#### 🌉 Bridge (Consensus Backend)

```bash
npm run dev:bridge
```

- Opens on: `http://localhost:8000`
- Stack: Python + FastAPI

---

## First-Time Setup

### 1. Install Dependencies

```bash
# Install all Node.js packages
npm install

# Install Python packages for Bridge
cd packages/bridge
pip install -r requirements.txt
cd ../..
```

### 2. Configure Environment Variables

#### HUD Environment

Create `packages/hud/.env.local`:

```env
NEXT_PUBLIC_BRAIN_API_URL=http://localhost:8080
NEXT_PUBLIC_BRIDGE_API_URL=http://localhost:8000
```

#### Brain Environment

Create `packages/brain/.env`:

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token

# Server
PORT=8080
NODE_ENV=development
```

#### Bridge Environment

Create `packages/bridge/.env`:

```env
# LLM API Keys
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GEMINI_API_KEY=your-gemini-key

# Server
PORT=8000
ENVIRONMENT=development
```

### 3. Health Check

```bash
npm run omega:doctor
```

---

## Development Workflow

### Running Tests

```bash
# All packages
npm test

# Specific package
npm run test --workspace=packages/hud
npm run test --workspace=packages/brain
cd packages/bridge && pytest
```

### Building for Production

```bash
# Build all
npm run build

# Build specific
npm run build:hud
npm run build:brain
```

### Linting

```bash
npm run lint
```

---

## Brain-Specific Commands

The Brain package has extensive capabilities:

```bash
# Start orchestrator (agent coordination)
npm run orchestrate

# Start with file watching
npm run orchestrate:watch

# Start individual agent workers
npm run worker:claude
npm run worker:gemini
npm run worker:codex

# Start SAFA Telegram bot
npm run safa

# Database operations
npm run seed:members         # Seed initial data
npm run health:db           # Check database health
npm run init:local-db       # Initialize local SQLite
npm run sync:two-way        # Sync between local and Supabase

# Utilities
npm run rotate-logs         # Rotate log files
npm run security:scan-bidi  # Security scan
```

---

## Troubleshooting

### Port Already in Use

If you get port conflicts:

```bash
# Windows - Find process on port
netstat -ano | findstr :3000
netstat -ano | findstr :8080
netstat -ano | findstr :8000

# Kill process by PID
taskkill /PID <pid> /F
```

### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules
npm install
```

### Python Dependencies

```bash
cd packages/bridge
pip install --upgrade pip
pip install -r requirements.txt
```

### Database Issues

```bash
npm run health:db
npm run init:local-db
```

---

## Service Architecture

```
┌──────────────────────────────────────────────────────┐
│  🎨 HUD (localhost:3000)                             │
│  ├─ User Interface                                   │
│  ├─ Neuro-Link Dashboard                             │
│  └─ Real-time Updates                                │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  🧠 Brain (localhost:8080)                           │
│  ├─ Memory Layer (Supabase + SQLite)                 │
│  ├─ Agent Orchestrator                               │
│  ├─ WebSocket Server                                 │
│  ├─ File Upload Handler                              │
│  └─ Telegram Bot                                     │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  🌉 Bridge (localhost:8000)                          │
│  ├─ DCBFT Consensus Engine                           │
│  ├─ Worker Pool Manager                              │
│  ├─ LLM Client Proxy                                 │
│  └─ Distributed Memory                               │
└──────────────────────────────────────────────────────┘
```

---

## Production Deployment

### Build Production Bundle

```bash
npm run build
```

### Environment Variable Checklist

- ✅ All API keys configured
- ✅ Production database URLs
- ✅ CORS settings updated
- ✅ Rate limiting configured
- ✅ Logging levels set

### Start Production Servers

```bash
npm run start
```

Or individually:

```bash
npm run start:hud      # Next.js production server
npm run start:brain    # Node.js backend
npm run start:bridge   # Uvicorn ASGI server
```

---

## Monitoring

### Logs

- **HUD**: Check browser console and Next.js terminal output
- **Brain**: `packages/brain/logs/`
- **Bridge**: FastAPI debug output

### Health Endpoints

- HUD: `http://localhost:3000/api/health`
- Brain: `http://localhost:8080/health`
- Bridge: `http://localhost:8000/health`

---

## Common Tasks

| Task | Command |
|------|---------|
| Start dev environment | `npm run dev` |
| Run all tests | `npm test` |
| Check health | `npm run omega:doctor` |
| Seed database | `npm run seed:members` |
| Start Telegram bot | `npm run safa` |
| Build production | `npm run build` |
| Clean install | `rm -rf node_modules && npm install` |

---

**💡 Tip:** Keep this guide handy for quick reference during development!
