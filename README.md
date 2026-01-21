# 🌌 OMEGA Trinity

**Unified AI Agent Ecosystem** - A monorepo containing the complete OMEGA Trinity stack: HUD (frontend), Brain (memory/orchestration), and Bridge (backend consensus).

---

## 📦 Project Structure

```
omega-trinity/
├── packages/
│   ├── hud/              # 🎨 OMEGA HUD (Next.js Frontend)
│   │   └── Jarvis Neuro-Link interface
│   ├── brain/            # 🧠 gAIng-Brain (Memory & Orchestration)
│   │   ├── frontend/     # React frontend
│   │   ├── cli/          # Command-line interface
│   │   ├── mcp/          # MCP server
│   │   ├── alexa-skill/  # Alexa integration
│   │   ├── desktop/      # Desktop app
│   │   └── mobile/       # Mobile app
│   └── bridge/           # 🌉 CollectiveBrain Bridge (Python FastAPI)
│       └── DCBFT consensus engine
├── package.json          # Root workspace config
└── README.md             # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Python** >= 3.9 (for Bridge)
- **Git**

### Installation

```bash
# Install all Node.js dependencies across all workspaces
npm install

# Install Python dependencies for Bridge
cd packages/bridge
pip install -r requirements.txt
cd ../..
```

Or use the convenience script:

```bash
npm run install:all
```

### Running the Full Stack

**Development Mode (All Services):**

```bash
npm run dev
```

This starts:

- 🎨 **HUD** on `http://localhost:3000`
- 🧠 **Brain** on `http://localhost:8080`
- 🌉 **Bridge** on `http://localhost:8000`

**Individual Services:**

```bash
npm run dev:hud      # Start only the frontend
npm run dev:brain    # Start only the brain/memory layer
npm run dev:bridge   # Start only the Python backend
```

---

## 📚 Package Details

### 🎨 HUD (Jarvis Neuro-Link)

- **Location:** `packages/hud/`
- **Tech Stack:** Next.js 14, React, TypeScript, TailwindCSS, Framer Motion
- **Purpose:** Primary user interface for OMEGA ecosystem
- **Commands:**

  ```bash
  npm run dev:hud      # Development server
  npm run build:hud    # Production build
  npm run start:hud    # Start production server
  ```

### 🧠 Brain (gAIng-Brain)

- **Location:** `packages/brain/`
- **Tech Stack:** Node.js, Express, Supabase, OpenAI, Mem0AI
- **Purpose:** Collective memory, orchestration, and agent coordination
- **Key Features:**
  - Multi-agent orchestration
  - Persistent memory layer (Supabase + local SQLite)
  - SAFA Telegram bot
  - Real-time WebSocket support
  - Screenshot capabilities
- **Commands:**

  ```bash
  npm run start:brain          # Start server
  npm run orchestrate          # Run orchestrator
  npm run safa                 # Start Telegram bot
  npm run omega:doctor         # Health check
  ```

### 🌉 Bridge (CollectiveBrain)

- **Location:** `packages/bridge/`
- **Tech Stack:** Python, FastAPI, DCBFT Consensus
- **Purpose:** Backend coordination and consensus protocol
- **Key Features:**
  - DCBFT (Decentralized Collective Brain Fault Tolerance) consensus
  - Worker pool management
  - LLM client integration
  - Distributed memory layer
- **Commands:**

  ```bash
  cd packages/bridge
  python main.py               # Start development server
  uvicorn main:app --reload    # Alternative start
  pytest tests/                # Run tests
  ```

---

## 🛠️ Useful Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Run all services in development mode |
| `npm run build` | Build all packages |
| `npm run test` | Run tests across all packages |
| `npm run lint` | Lint all packages |
| `npm run omega:doctor` | Run health diagnostics |

---

## 🔧 Configuration

### Environment Variables

Each package has its own `.env` file:

**HUD (`packages/hud/.env.local`):**

```env
NEXT_PUBLIC_BRAIN_API_URL=http://localhost:8080
NEXT_PUBLIC_BRIDGE_API_URL=http://localhost:8000
```

**Brain (`packages/brain/.env`):**

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
TELEGRAM_BOT_TOKEN=your_telegram_token
PORT=8080
```

**Bridge (`packages/bridge/.env`):**

```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
```

Copy `.env.example` files to `.env` in each package and fill in your values.

---

## 🧪 Testing

```bash
# Test all packages
npm run test

# Test individual packages
npm run test --workspace=packages/hud
npm run test --workspace=packages/brain
cd packages/bridge && pytest
```

---

## 📖 Documentation

- **HUD Documentation:** `packages/hud/README.md`
- **Brain Documentation:** `packages/brain/README.md`
- **Bridge Documentation:** `packages/bridge/README.md`

---

## 🤝 Contributing

This is a unified monorepo. When working on features:

1. **Create a feature branch** from `main`
2. **Work in the appropriate package** (`hud`, `brain`, or `bridge`)
3. **Test your changes** locally
4. **Commit with clear messages**
5. **Push and create a PR**

---

## 📝 License

ISC License - See individual package licenses for details.

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     OMEGA Trinity                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │  🎨 HUD      │◄────►│  🧠 Brain    │                │
│  │  (Next.js)   │      │  (Node.js)   │                │
│  │              │      │              │                │
│  │  - UI/UX     │      │  - Memory    │                │
│  │  - Dashboard │      │  - Agents    │                │
│  │  - Controls  │      │  - Storage   │                │
│  └──────────────┘      └──────┬───────┘                │
│         ▲                     │                         │
│         │                     │                         │
│         │              ┌──────▼────────┐                │
│         └─────────────►│  🌉 Bridge    │                │
│                        │  (FastAPI)    │                │
│                        │               │                │
│                        │  - Consensus  │                │
│                        │  - Workers    │                │
│                        │  - LLM Proxy  │                │
│                        └───────────────┘                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### "Cannot find module" errors

```bash
npm install  # Reinstall dependencies
```

### Port conflicts

Check if ports 3000, 8000, or 8080 are in use:

```bash
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :8080
```

### Python dependencies issues

```bash
cd packages/bridge
pip install --upgrade pip
pip install -r requirements.txt
```

### Health Check

```bash
npm run omega:doctor
```

---

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with 💜 by the gAIng Collective**
