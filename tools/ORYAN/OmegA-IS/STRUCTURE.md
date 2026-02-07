# 📁 OMEGA Trinity - Directory Structure

```
omega-trinity/                          # 🌌 Root monorepo
│
├── 📦 packages/                         # All sub-packages
│   │
│   ├── 🎨 hud/                          # OMEGA HUD (Jarvis Neuro-Link)
│   │   ├── .next/                      # Next.js build output (gitignored)
│   │   ├── public/                     # Static assets
│   │   ├── src/
│   │   │   ├── app/                    # Next.js 14 app directory
│   │   │   │   ├── page.tsx            # Home page
│   │   │   │   ├── layout.tsx          # Root layout
│   │   │   │   └── api/                # API routes
│   │   │   ├── components/             # React components
│   │   │   ├── lib/                    # Utility functions
│   │   │   └── styles/                 # Global styles
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js
│   │   └── next.config.js
│   │
│   ├── 🧠 brain/                        # gAIng-Brain (Memory & Orchestration)
│   │   ├── src/                        # Source code
│   │   │   ├── orchestrator.js         # Main orchestration logic
│   │   │   ├── agent-worker.js         # Agent worker processes
│   │   │   └── safa-telegram-bot.js    # Telegram bot
│   │   ├── scripts/                    # Utility scripts
│   │   │   ├── seed-members.js
│   │   │   ├── health-check.js
│   │   │   ├── init-local-db.js
│   │   │   └── sync-two-way.js
│   │   ├── tools/                      # Development tools
│   │   │   ├── omega-doctor.mjs        # Health diagnostics
│   │   │   └── scan-bidi.mjs           # Security scanner
│   │   ├── frontend/                   # React frontend (sub-workspace)
│   │   │   ├── src/
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   └── hooks/
│   │   │   └── package.json
│   │   ├── cli/                        # CLI tool (sub-workspace)
│   │   │   ├── bin/
│   │   │   ├── commands/
│   │   │   └── package.json
│   │   ├── mcp/                        # MCP server (sub-workspace)
│   │   │   ├── server/
│   │   │   └── package.json
│   │   ├── alexa-skill/                # Alexa integration
│   │   ├── desktop/                    # Desktop app (Electron)
│   │   ├── mobile/                     # Mobile app (React Native)
│   │   ├── uploads/                    # File uploads (gitignored)
│   │   ├── logs/                       # Log files (gitignored)
│   │   ├── index.js                    # Main entry point
│   │   ├── package.json
│   │   └── .env                        # Environment config (gitignored)
│   │
│   └── 🌉 bridge/                       # CollectiveBrain Bridge (Python)
│       ├── tests/                      # Test suite
│       │   ├── test_consensus.py
│       │   ├── test_memory.py
│       │   └── test_orchestrator.py
│       ├── .github/                    # GitHub workflows
│       │   └── workflows/
│       ├── main.py                     # FastAPI entry point
│       ├── consensus_engine.py         # DCBFT consensus logic
│       ├── memory_layer.py             # Distributed memory
│       ├── orchestrator.py             # Task orchestration
│       ├── worker_pool.py              # Worker management
│       ├── llm_client.py               # LLM proxy client
│       ├── requirements.txt            # Python dependencies
│       ├── Dockerfile                  # Docker configuration
│       ├── docker-compose.yml          # Docker compose
│       ├── setup.py                    # Package setup
│       └── .env                        # Environment config (gitignored)
│
├── 📄 Configuration Files (Root)
│   ├── package.json                    # Root workspace config
│   ├── package-lock.json               # Lock file
│   ├── .gitignore                      # Git ignore rules
│   ├── .git/                           # Git repository
│   └── gAIng-Brain.code-workspace      # VS Code workspace
│
├── 📚 Documentation
│   ├── README.md                       # Main project README
│   ├── STARTUP.md                      # Startup guide
│   ├── STRUCTURE.md                    # This file
│   ├── AGENTS.md                       # Agent documentation
│   ├── CLAUDE.md                       # Claude-specific docs
│   └── GEMINI.md                       # Gemini-specific docs
│
└── 🛠️ Other Files
    ├── log.md                          # Project log
    ├── supabase.exe                    # Supabase CLI (Windows)
    └── public/                         # Public assets (if any)
```

---

## 🎯 Key Directories Explained

### `/packages/hud/` - Frontend Dashboard

The user-facing interface built with Next.js. This is what users interact with directly.

- **Tech:** Next.js 14, React, TypeScript, TailwindCSS
- **Port:** 3000
- **Entry:** `src/app/page.tsx`

### `/packages/brain/` - Memory & Orchestration

The core intelligence layer that manages memory, coordinates agents, and handles communication.

- **Tech:** Node.js, Express, Supabase, WebSocket
- **Port:** 8080
- **Entry:** `index.js`
- **Sub-packages:** Contains 6 additional workspaces (frontend, cli, mcp, etc.)

### `/packages/bridge/` - Consensus Backend

The Python backend implementing the DCBFT consensus protocol for distributed agent coordination.

- **Tech:** Python, FastAPI, DCBFT
- **Port:** 8000
- **Entry:** `main.py`

---

## 🔄 Data Flow

```
User Input → HUD (Next.js)
              ↓
              Brain (Node.js) ← → Supabase (Cloud DB)
              ↓                ← → SQLite (Local DB)
              ↓
              Bridge (Python) → Consensus → Workers → LLMs
                                                      ↓
                                                   Response
```

---

## 🧩 Workspace Relationships

```
Root (omega-trinity)
├── packages/hud              [workspace]
├── packages/brain            [workspace]
│   ├── frontend              [nested workspace]
│   ├── cli                   [nested workspace]
│   ├── mcp                   [nested workspace]
│   ├── alexa-skill           [nested workspace]
│   ├── desktop               [nested workspace]
│   └── mobile                [nested workspace]
└── packages/bridge           [Python package]
```

---

## 📦 Package Dependencies

### HUD Dependencies

- `next` - Framework
- `react` - UI library
- `framer-motion` - Animations
- `zustand` - State management
- `tailwindcss` - Styling

### Brain Dependencies

- `express` - Web server
- `@supabase/supabase-js` - Database client
- `openai` - LLM integration
- `ws` - WebSocket server
- `mem0ai` - Memory management
- `multer` - File uploads
- `cors` - CORS handling

### Bridge Dependencies (Python)

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `httpx` - HTTP client
- `pytest` - Testing framework

---

## 🚫 Gitignored Directories

These are automatically generated and should NOT be committed:

```
node_modules/           # All npm packages
.next/                  # Next.js build
__pycache__/            # Python cache
*.pyc                   # Compiled Python
.env*                   # Environment variables
uploads/                # User uploads
logs/                   # Log files
dist/                   # Build output
build/                  # Build output
.pytest_cache/          # Pytest cache
```

---

## 📝 Important Files

| File | Purpose |
|------|---------|
| `package.json` (root) | Workspace configuration |
| `packages/hud/package.json` | HUD dependencies |
| `packages/brain/package.json` | Brain dependencies |
| `packages/bridge/requirements.txt` | Bridge Python deps |
| `.gitignore` | Git exclusions |
| `README.md` | Project overview |
| `STARTUP.md` | Quick start guide |

---

## 🔧 Configuration Files

### TypeScript Projects

- `packages/hud/tsconfig.json` - HUD TypeScript config
- Each workspace may have its own `tsconfig.json`

### Build Configs

- `packages/hud/next.config.js` - Next.js configuration
- `packages/hud/tailwind.config.js` - Tailwind CSS config
- `packages/hud/postcss.config.js` - PostCSS config

### Python Config

- `packages/bridge/setup.py` - Python package setup
- `packages/bridge/Dockerfile` - Docker image
- `packages/bridge/docker-compose.yml` - Multi-container setup

---

**💡 This structure is designed for maximum agent accessibility and maintainability!**
