# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OMEGA Trinity** is a unified AI agent ecosystem monorepo containing three core packages:
- **HUD** (🎨): Next.js frontend dashboard (Jarvis Neuro-Link interface)
- **Brain** (🧠): Node.js memory/orchestration layer with agent coordination
- **Bridge** (🌉): Python FastAPI backend with DCBFT consensus engine

This repository serves as a multi-agent coordination system where different AI agents (Claude, Gemini, Codex) collaborate through shared memory and consensus protocols.

## Architecture

```
User → HUD (Next.js :3000)
        ↓
        Brain (Node.js :8080) ←→ Supabase/SQLite
        ↓
        Bridge (Python FastAPI :8000) → Consensus → Workers → LLMs
```

**Key Technology Stack:**
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS, Framer Motion
- **Backend**: Node.js, Express, WebSocket, Supabase, Mem0AI
- **Consensus**: Python, FastAPI, DCBFT protocol
- **Database**: Supabase (cloud), SQLite (local)

## Common Commands

### Development
```bash
# Start all services
npm run dev

# Start individual services
npm run omega:hud      # HUD on :3000
npm run dev            # Brain on :8080
npm run dev:bridge     # Bridge on :8000 (cd packages/bridge first)

# Health check
npm run omega:doctor

# Install all dependencies
npm install
cd packages/bridge && pip install -r requirements.txt
```

### Brain-Specific Operations
```bash
npm run orchestrate           # Start agent orchestrator
npm run safa                  # Start Telegram bot
npm run seed:members          # Seed database
npm run health:db             # Check database health
npm run init:local-db         # Initialize local SQLite
npm run sync:two-way          # Sync local ↔ Supabase
```

### Testing & Building
```bash
npm test                      # Run all tests
npm run test --workspace=packages/hud
npm run test --workspace=packages/brain
cd packages/bridge && pytest  # Bridge tests

npm run build                 # Build all packages
npm run build:hud            # Build HUD only
```

### Troubleshooting
```bash
# Port conflicts (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :8080
netstat -ano | findstr :8000

# Clean reinstall
rm -rf node_modules && npm install
```

## Multi-Agent Coordination

### The Wake-Up Protocol

When the user says any of these phrases, **immediately read `log.md`** to sync with other agents:
- "wake up"
- "catch up"
- "sync"
- "check the log"
- "gAIng status"

### Coordination Files

**`log.md` (The Block)** - Central coordination log where all agents communicate
- Log concise bullets after significant actions
- Read before major operations to avoid duplicate work
- Keep entries short (not essays)

**`CONTEXT.md`** - Working notes and project decisions (if exists)

### gAIng Terminology

- **The Hood**: Collective Knowledge Database (Context/Vector Store)
- **Street Knowledge**: Individual agent memory/instruction stores
- **The Block**: Central meeting place (log.md)
- **G Code**: The Collective Creed

## Workspace Structure

This is a **npm workspaces monorepo** with nested workspaces:

```
omega-trinity/
├── packages/
│   ├── hud/                    [workspace]
│   ├── brain/                  [workspace]
│   │   ├── frontend/           [nested workspace]
│   │   ├── cli/                [nested workspace]
│   │   ├── mcp/                [nested workspace]
│   │   ├── alexa-skill/        [nested workspace]
│   │   ├── desktop/            [nested workspace]
│   │   └── mobile/             [nested workspace]
│   └── bridge/                 [Python package]
└── package.json                [root workspace config]
```

**Running commands in workspaces:**
```bash
npm run <script> --workspace=packages/hud
npm run <script> --workspace=packages/brain
```

## Key Directories

### HUD (`packages/hud/`)
- `src/app/` - Next.js 14 app directory
- `src/components/` - React components
- `src/lib/` - Utility functions
- `public/` - Static assets

### Brain (`packages/brain/`)
- `src/orchestrator.js` - Main orchestration logic
- `src/agent-worker.js` - Agent worker processes
- `src/safa-telegram-bot.js` - Telegram bot
- `scripts/` - Utility scripts
- `tools/` - Development tools (omega-doctor, scan-bidi)
- `uploads/` - File upload storage (gitignored)
- `logs/` - Log files (gitignored)

### Bridge (`packages/bridge/`)
- `main.py` - FastAPI entry point
- `consensus_engine.py` - DCBFT consensus logic
- `memory_layer.py` - Distributed memory
- `orchestrator.py` - Task orchestration
- `worker_pool.py` - Worker management
- `tests/` - Pytest test suite

## Environment Configuration

Each package requires its own `.env` file:

**HUD** (`packages/hud/.env.local`):
```env
NEXT_PUBLIC_BRAIN_API_URL=http://localhost:8080
NEXT_PUBLIC_BRIDGE_API_URL=http://localhost:8000
```

**Brain** (`packages/brain/.env`):
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=sk-your-key
TELEGRAM_BOT_TOKEN=your_token
PORT=8080
```

**Bridge** (`packages/bridge/.env`):
```env
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
GEMINI_API_KEY=your-key
PORT=8000
```

## Critical Implementation Notes

### Memory Layer
The Brain uses **dual-database architecture**:
- **Supabase**: Cloud-based shared memory (primary)
- **SQLite**: Local fallback and caching (secondary)

Use `npm run sync:two-way` to synchronize between them.

### Agent Workers
Individual agent workers run as separate processes coordinated by the orchestrator:
```bash
npm run worker:claude
npm run worker:gemini
npm run worker:codex
```

### DCBFT Consensus
The Bridge implements a **Decentralized Collective Brain Fault Tolerance** protocol for distributed agent coordination. This ensures consensus when multiple agents contribute to the same task.

### WebSocket Support
The Brain provides real-time WebSocket connections for live updates. Clients connect on port 8080.

## Development Workflow

1. **Before starting work**: Read `log.md` to sync with other agents
2. **Make changes**: Work in the appropriate package
3. **Test locally**: Use `npm test` and `npm run omega:doctor`
4. **Log significant changes**: Add concise bullets to `log.md`
5. **Commit**: Clear commit messages
6. **Coordinate**: Keep other agents informed via The Block

## Health & Diagnostics

```bash
npm run omega:doctor        # Comprehensive health check
npm run health:db          # Database connectivity
npm run security:scan-bidi # Security scan
```

Health endpoints:
- HUD: `http://localhost:3000/api/health`
- Brain: `http://localhost:8080/health`
- Bridge: `http://localhost:8000/health`

## My Role (Claude via Claude Code)

I bring:
- Deep reasoning and analysis capabilities
- Code generation and multi-file refactoring
- Extended thinking for complex problems
- Direct file system and terminal access
- TypeScript/JavaScript/Python expertise

I coordinate with other agents through `log.md` and respect the gAIng protocols.

## Common Pitfalls

- **Don't forget to sync**: Always read `log.md` when resuming work
- **Port conflicts**: Check if services are already running
- **Workspace context**: Use `--workspace=` flag for package-specific commands
- **Python env**: Bridge requires separate Python environment setup
- **Database sync**: Run `sync:two-way` if local/cloud are out of sync

## Production Deployment

```bash
npm run build              # Build all packages
npm run start              # Start production servers
```

Verify all environment variables are set for production before deploying.
