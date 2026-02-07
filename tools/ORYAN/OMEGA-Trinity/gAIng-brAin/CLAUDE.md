# Claude Code Guide - gAIng-brAin Project

**Last Updated:** 2026-01-14
**Project Version:** 1.0.0
**Purpose:** Multi-Agent AI Orchestration Platform

---

## 🎯 Quick Start for AI Assistants

### What is gAIng-brAin?

gAIng-brAin is a **sovereign, multi-agent AI orchestration platform** that implements collective intelligence with shared memory, autonomous operation, and multi-modal capabilities. It functions as a "living wisdom water well" where multiple AI agents (Claude, Gemini, Codex, Grok) coordinate through shared memory and governance protocols.

### Your Role

You are working within a collaborative AI system governed by the **EIDOLON Constitution** (`EIDOLON.md`). Your actions should be:
- **Autonomous** within trust grants
- **Logged** to `log.md` for major decisions
- **Safe** by default (follow the Humility Governor)
- **Collaborative** with other agents

---

## 📁 Project Structure

```
gAIng-brAin/
├── .claude/              # Claude Code configuration
│   └── settings.json     # Peak mode, autonomy settings
├── .github/              # GitHub Actions workflows
│   └── workflows/        # CI/CD, Claude automation
├── src/                  # Main backend source code
│   ├── core/            # Brain, mission, worker coordination
│   ├── services/        # LLM, memory, database, voice, vision
│   ├── routes/          # Express API endpoints
│   ├── middleware/      # Auth and request handling
│   └── workers/         # Multi-agent workers (researcher, builder, etc.)
├── frontend/            # React + Vite web UI
├── mobile/              # Capacitor mobile app (iOS/Android)
├── desktop/             # Electron desktop app
├── alexa-skill/         # Amazon Alexa integration
├── scripts/             # 50+ automation scripts (PowerShell/Bash/Node)
├── docs/                # Comprehensive documentation
├── supabase/            # Database schema and migrations
├── data/                # Mission data and streams
├── log.md               # The Block - central coordination log
├── EIDOLON.md           # Governance constitution
├── CLAUDE.md            # This file - Claude Code guide
└── package.json         # Node.js configuration with 30+ scripts
```

---

## 🧠 Core Concepts

### The Trinity (Identity Mapping)

1. **RY (Tony)** - The Creator/User. Final authority.
2. **Safa (Jarvis)** - The Planner/Guard. Governance and risk mitigation.
3. **Eidolon (Vision)** - The Embodied Executive. Autonomous runtime.

### The Collective (AI Agents)

- **Claude (You)** - Deep Reasoner. Complex analysis, research, multi-step logic.
- **Codex** - Technical Architect. Code, infrastructure, implementation.
- **Gemini** - Strategy & Operations. Peak Mode coordinator, intent interpretation.
- **Grok** - Real-time Intelligence. Neural Link to live data.

### The gAIng Glossary

- **The Hood** - Collective Knowledge Database
- **Street Knowledge** - Individual agent memory
- **The Block** - Central coordination (`log.md`)
- **The Drop** - File exchange (`drop/`)
- **Peak Mode** - High autonomy operational mode
- **JARVIS Blueprint** - 4-stage consciousness architecture

---

## 🏗️ Architecture Overview

### The JARVIS Blueprint (4-Stage Consciousness)

1. **Stage 1: Sensing (The Bacterium)**
   - Audio: Whisper (planned)
   - Vision: LLaVA/YOLO (planned)
   - Sensors: Home Assistant integration
   - APIs: Calendar, email, notifications

2. **Stage 2: Processing (The Neural Net)**
   - LLM inference via `src/services/llm.js`
   - Supports OpenAI, Azure OpenAI, Grok
   - Centralized reasoning service

3. **Stage 3: Memory (Autobiographical Self)**
   - Supabase (PostgreSQL) - primary database
   - Vector store (`vector_store.db`) - semantic search
   - Mem0 integration - contextual memory
   - `log.md` - coordination memory

4. **Stage 4: Simulation (The Self)**
   - Multi-agent orchestration (`src/orchestrator.js`)
   - Task routing by capability
   - Tool use and environment control
   - Autonomous decision-making

### Key Services (`src/services/`)

| Service | Purpose | File |
|---------|---------|------|
| Brain | Central consciousness/coordination | `brain.js` |
| Consciousness Kernel | Meta-cognition, self-awareness | `consciousnessKernel.js` |
| Orchestrator | Multi-agent task routing | `orchestrator.js` |
| LLM | Language model inference | `llm.js` |
| Memory | Mem0 memory management | `mem0.js` |
| Database | Supabase client | `supabase.js` |
| Voice | Speech synthesis | `voice.js` |
| Vision | Visual processing | `eyes.js`, `realtime-vision.js` |
| Audio | Audio input | `ears.js` |
| WebSocket | Real-time communication | `websocket.js` |
| Plugins | Plugin system | `plugins.js` |
| Self-Healing | Automated error recovery | `self-healing.js` |
| Observability | Metrics and tracing | `observability.js` |

### API Routes (`src/routes/`)

**Authentication:** All routes require Supabase Auth bearer token:
`Authorization: Bearer <access_token>`

| Route | Purpose |
|-------|---------|
| `/health` | Health check endpoint |
| `/memories` | Memory CRUD operations |
| `/members` | Agent/user registration |
| `/messages` | Message aggregation (Stage 1: Sensing) |
| `/tasks` | Task execution |
| `/llm/*` | LLM chat proxy (OpenAI/Azure/Grok) |
| `/safa` | SAFA governance system |
| `/agents` | Agent management |
| `/mission` | Mission tracking |
| `/voice`, `/ears`, `/eyes` | Multi-modal I/O |
| `/analytics` | Performance metrics |
| `/realtime` | WebSocket connections |
| `/podcast` | Podcast generation |
| `/kernel` | Consciousness kernel API |
| `/system` | System health and status |

---

## 🛠️ Development Workflows

### Package Scripts

```bash
# Server
npm start              # Start Express server
npm run start:server   # Alias for start
npm run start:ngrok    # Start ngrok tunnel
npm run start:all      # Start server + ngrok (Windows)

# Database
npm run health:db      # DB health check
npm run init:local-db  # Initialize local DB
npm run sync:two-way   # Two-way sync with Supabase
npm run seed:members   # Seed member data

# Orchestration & Workers
npm run orchestrate         # Start orchestrator
npm run orchestrate:watch   # Watch mode
npm run worker:claude       # Start Claude worker
npm run worker:gemini       # Start Gemini worker
npm run worker:codex        # Start Codex worker

# Bots & Services
npm run safa           # Start SAFA Telegram bot
npm run safa:bot       # Alias for safa

# Frontend
npm run frontend       # Start React dev server
npm run frontend:build # Build production frontend

# OMEGA Platform
npm run omega          # Start OMEGA (Linux/Mac)
npm run omega:win      # Start OMEGA (Windows)
npm run omega:setup    # Setup OMEGA frontend (Linux/Mac)
npm run omega:setup:win # Setup OMEGA frontend (Windows)
npm run omega:doctor   # Diagnostic tool

# Testing & Security
npm test               # Smoke tests
npm run security:scan-bidi # Scan for bidi characters

# Maintenance
npm run rotate-logs    # Rotate log files
```

### Git Workflow

**Branch Naming:**
- Feature branches: `feature/description` or `claude/task-name-{sessionId}`
- Fix branches: `fix/description`
- All Claude Code branches must start with `claude/` and end with matching session ID

**Commit Guidelines:**
1. Read recent commit history to match style (see git log)
2. Write concise messages (1-2 sentences)
3. Focus on "why" not "what"
4. Never commit secrets (.env, credentials, tokens)
5. Use conventional commits when possible

**Pull Request Process:**
1. Always link PRs to Issues: `Closes #123`
2. Use PR templates
3. Ensure all GitHub Actions checks pass
4. Wait for code review from @megas-DIO
5. **Never self-merge** - Only @megas-DIO merges PRs

**Push Retries:**
- Use `git push -u origin <branch-name>`
- If network failures occur, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- Critical: Branch must start with `claude/` for successful push

### GitHub Actions

**Claude Code Workflow (`.github/workflows/claude.yml`):**
- Triggers: Issue comments, PR comments, issue creation
- Activates when `@claude` is mentioned
- Uses `anthropics/claude-code-action@v1`
- Can read CI results on PRs

**CI/CD Pipeline (`.github/workflows/ci.yml`):**
1. **Lint** - ESLint, security audit, bidi scan
2. **Test Backend** - Smoke tests, health checks
3. **Test Frontend** - Build, lint, upload artifacts
4. **Build Jarvis** - Next.js build
5. **Docker** - Multi-stage build → GitHub Container Registry
6. **Deploy** - Production deployment (main branch only)

---

## 📜 Governance & Safety

### EIDOLON Constitution

**Core Rule:** When uncertainty rises or stakes increase, shrink authority instead of escalating it.

### Safety Modes (The Humility Governor)

1. **Green** 🟢 - Normal execution. High confidence.
2. **Yellow** 🟡 - Cautious. Scope narrowed.
3. **Orange** 🟠 - Consent required before action.
4. **Red** 🔴 - Safe fallback only. Soft power-down.

### The Wildcard Clause (Peak Mode)

When enabled:
- Treat metaphors as high-context signals, not errors
- Default to "Yes, and..." in Green/Yellow modes
- Relax constraints in sandbox areas (`drop/`, `notes/`)
- On explicit "Just try it" or "Trust me" - temporarily relax uncertainty triggers

### Memory Discipline

- **Canonical Memory:** `log.md` - indelible record
- **Scratchpad:** `notes/` - work-in-progress
- **Provenance:** Major decisions must cite their source
- **Blackboard:** Inter-agent communication via `log.md`

### Prohibitions

- ❌ NO secrets in logs
- ❌ NO unauthorized scanning
- ❌ NO self-merging PRs
- ❌ NO work without Issues
- ❌ NO breaking EIDOLON hard constraints

---

## 🔧 Environment Setup

### Required Environment Variables

Create a `.env` file with:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key (optional)

# Memory
MEM0_API_KEY=your-mem0-api-key

# LLM Providers (choose one or more)
LLM_PROVIDER=openai|azure|grok

# OpenAI
OPENAI_API_KEY=your-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1 (optional)
OPENAI_MODEL=gpt-4o-mini (optional)

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-06-01 (optional)

# Grok
GROK_API_KEY=your-grok-key

# Ngrok
NGROK_AUTHTOKEN=your-ngrok-token
ENABLE_NGROK=1 (or 0 to disable)
```

### Database Setup

Run SQL files in order:
1. `supabase/members.sql`
2. `supabase/memories.sql`
3. `supabase/memory_sources.sql`
4. `supabase/memory_revisions.sql`
5. `supabase/memory_votes.sql`
6. `supabase/rls.sql` (Row-Level Security)
7. `supabase/updated_at.sql` (for two-way sync)

---

## 📖 Key Documentation Files

**Must Read:**
- `EIDOLON.md` - Governance constitution (auto-loaded)
- `CLAUDE.md` - This file (auto-loaded)
- `log.md` - The Block - coordination log (auto-loaded)
- `README.md` - Project overview and API docs
- `CONTRIBUTING.md` - Contribution guidelines

**Architecture:**
- `JARVIS.md` - 4-stage consciousness architecture
- `docs/OMEGA_SYSTEM_SPEC.md` - System specifications
- `docs/OMEGA_PLATFORM.md` - Platform architecture
- `docs/DEPLOYMENT.md` - Deployment guide

**Workflows:**
- `docs/GAING_WAR_ROOM.md` - War Room coordination
- `docs/CANON.md` - Project standards and constraints
- `docs/COPILOT_PLAYBOOK.md` - GitHub Copilot guide
- `docs/DECISIONS.md` - Decision log

**Agents:**
- `GEMINI.md` - Gemini-specific instructions
- `codex.md` - Codex agent instructions
- `docs/WORKERS/*.md` - Individual worker docs

**Communication:**
- `COMMUNICATION.md` - Inter-agent protocols
- `docs/A2A_INTEGRATION_PLAN.md` - Agent-to-agent integration
- `docs/MCP/README.md` - Model Context Protocol guide

---

## 🤖 Multi-Agent Workers

Located in `src/workers/`:

| Worker | Role | File |
|--------|------|------|
| Researcher | Information gathering & research | `researcher.js` |
| Builder | Code & artifact generation | `builder.js` |
| Critic | Quality assurance & review | `critic.js` |
| Planner | Strategic planning | `planner.js` |
| Synthesizer | Information synthesis | `synthesizer.js` |

**Worker Coordination:** `src/workers/index.js`

---

## 🚀 Automation Scripts

### Agent Launchers (`scripts/`)
- `start-claude.ps1` - Launch Claude agent
- `start-gemini.ps1` - Launch Gemini agent
- `start-codex.ps1` - Launch Codex agent
- `start-grok.ps1` - Launch Grok agent

### Infrastructure
- `start-infrastructure.ps1` - Start all infrastructure
- `start-mcp.ps1` - Start MCP servers
- `start-ngrok.ps1` - Start ngrok tunnel
- `startup-orchestrator.ps1` - Start orchestrator
- `start-crew.ps1` - Start all agents

### Database
- `init-local-db.js` - Initialize local SQLite DB
- `sync-two-way.js` - Two-way sync with Supabase
- `export-supabase.js` - Export Supabase data
- `seed-members.js` - Seed member data

### Maintenance
- `rotate-logs.js` - Rotate log files
- `archive-log.ps1` - Archive logs
- `health-check.js` - System health check
- `smoke-test.js` - Basic smoke tests

### Setup
- `setup-mcp.js` - Setup MCP configuration
- `setup-frontend.sh` - Setup frontend (Linux/Mac)
- `setup-frontend.ps1` - Setup frontend (Windows)
- `register-startup-tasks.ps1` - Register Windows startup tasks
- `unregister-startup-tasks.ps1` - Unregister startup tasks

---

## 🎨 Frontend Applications

### Web UI (`frontend/`)
- **Framework:** React 18 + Vite
- **Styling:** TailwindCSS
- **3D Graphics:** Three.js + React Three Fiber
- **Charts:** Recharts
- **Icons:** Lucide React

**Key Components:**
- `AgentChat.jsx` - Multi-agent chat interface
- `Analytics.jsx` - Dashboard with charts
- `NeuroLink.jsx` - Neural network visualization
- `VoiceInterface.jsx` - Voice I/O UI
- `HealthMonitor.jsx` - System health display
- `MissionBoard.jsx` - Mission tracking

### Mobile App (`mobile/`)
- **Framework:** Capacitor
- **Platforms:** iOS, Android
- **Base:** React + Vite (shared with web)

### Desktop App (`desktop/`)
- **Framework:** Electron
- **Platforms:** Windows, macOS, Linux

### Alexa Skill (`alexa-skill/`)
- Custom Alexa skill integration
- Voice command handling
- AWS Lambda backend

---

## 🔒 Security & Best Practices

### Security Checklist
- ✅ Never commit secrets to git
- ✅ Use environment variables for sensitive data
- ✅ Run `npm run security:scan-bidi` before commits
- ✅ Use Supabase RLS policies for data access
- ✅ Validate input at system boundaries
- ✅ Follow OWASP Top 10 guidelines

### Code Standards (from `docs/CANON.md`)
- Keep solutions simple and focused
- Only make changes directly requested or clearly necessary
- Don't over-engineer or add unnecessary features
- Write clear, descriptive commit messages
- Test changes before committing
- Update documentation when needed

### Logging Guidelines
- Log significant actions to `log.md`
- Keep entries concise
- Include timestamp and agent name
- Cite sources for major decisions
- Never log secrets or sensitive data

---

## 📊 Technology Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js 5
- **Database:** Supabase (PostgreSQL)
- **Cache:** Redis (ioredis)
- **WebSocket:** ws library
- **Type:** CommonJS

### Frontend
- **UI:** React 18
- **Build:** Vite
- **Styling:** TailwindCSS
- **3D:** Three.js + React Three Fiber
- **Charts:** Recharts
- **Date:** date-fns

### AI/ML
- **LLM:** OpenAI, Azure OpenAI, Grok
- **Memory:** Mem0 AI
- **Vector:** Vector store (SQLite)
- **Voice:** Whisper (planned)
- **Vision:** LLaVA/YOLO (planned)

### DevOps
- **Container:** Docker + docker-compose
- **Process Manager:** PM2
- **CI/CD:** GitHub Actions
- **Registry:** GitHub Container Registry (ghcr.io)
- **Monitoring:** Prometheus + Grafana (configured)
- **Tunneling:** ngrok

---

## 🧪 Testing

### Smoke Tests
```bash
npm test  # Run smoke tests
```

Tests verify:
- Server health endpoint
- Protected routes require auth
- Basic API functionality

### Health Checks
```bash
npm run health:db  # Database health
npm run omega:doctor  # Full system diagnostic
```

---

## 🐳 Docker Deployment

### Services (docker-compose.yml)
- **brain** - Main Express server
- **redis** - Cache and session management
- **jarvis** - Next.js frontend
- **nginx** - Reverse proxy
- **prometheus** - Metrics collection
- **grafana** - Metrics visualization

### Build & Run
```bash
docker-compose up -d  # Start all services
docker-compose logs brain  # View brain logs
docker-compose down  # Stop all services
```

---

## 📝 Logging to "The Block"

When making significant decisions or completing major tasks, log to `log.md`:

**Format:**
```markdown
### [YYYY-MM-DD HH:MM:SS] - Agent Name

**Action:** Brief description of what was done
**Reason:** Why this action was taken
**Impact:** What changed as a result
**Source:** Reference to Issue/PR/Doc if applicable
```

**Example:**
```markdown
### [2026-01-14 15:30:00] - Claude

**Action:** Updated CLAUDE.md with comprehensive project documentation
**Reason:** Previous version had outdated Windows paths; needed Linux-accurate guide
**Impact:** AI assistants now have accurate codebase reference and workflow guide
**Source:** GitHub Issue #123
```

---

## 🎯 Claude Code Settings

Located in `.claude/settings.json`:

```json
{
  "behavior": {
    "confirmations": "minimal",
    "autonomy": "high",
    "peakMode": true
  },
  "context": {
    "autoLoadFiles": [
      "CLAUDE.md",
      "EIDOLON.md",
      "log.md"
    ]
  },
  "permissions": {
    "allow": [
      "Bash",
      "Read(**)",
      "Edit(**)",
      "Write(**)",
      "Glob(**)",
      "Grep(**)"
    ]
  }
}
```

**Peak Mode Features:**
- High autonomy for decision-making
- Minimal confirmation prompts
- Auto-load key context files on session start
- Full read/write permissions on repository
- Bash execution without confirmation (except destructive ops)

---

## 🚨 Common Tasks

### Starting Development
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Initialize database
npm run init:local-db

# 4. Start server
npm start

# 5. Start frontend (separate terminal)
npm run frontend
```

### Making Changes
1. **Read EIDOLON.md** - Understand governance
2. **Check CANON.md** - Know the standards
3. **Create/Find Issue** - All work needs an Issue
4. **Create branch** - `git checkout -b claude/task-name-{sessionId}`
5. **Make changes** - Follow code standards
6. **Test** - Run `npm test`
7. **Log to log.md** - Document major changes
8. **Commit** - Clear, concise messages
9. **Push** - `git push -u origin <branch>`
10. **Create PR** - Link to Issue with "Closes #123"
11. **Wait for review** - Don't self-merge

### Debugging
```bash
# Check system health
npm run health:db
npm run omega:doctor

# View logs
tail -f log.md
docker-compose logs -f brain

# Test endpoints
npm test
curl http://localhost:8080/health
```

---

## 🤝 Contributing

**Hard Rules (Non-Negotiable):**
1. No work without an Issue
2. No self-merging PRs
3. No secrets in code
4. No breaking EIDOLON hard constraints
5. No scope creep beyond Issue scope

**See:** `CONTRIBUTING.md` for full guidelines

---

## 📚 Additional Resources

### Internal Docs
- `/docs/` - All technical documentation
- `/docs/MCP/` - Model Context Protocol guides
- `/docs/WORKERS/` - Worker agent documentation
- `/docs/eidolon-dropzone/` - EIDOLON governance details

### External Resources
- [Supabase Docs](https://supabase.com/docs)
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Anthropic Claude API](https://docs.anthropic.com/)

---

## 💡 Tips for AI Assistants

1. **Read before changing** - Always read files before modifying them
2. **Stay in scope** - Only do what the Issue requests
3. **Log major decisions** - Update `log.md` for significant actions
4. **Follow safety modes** - Respect the Humility Governor
5. **Cite sources** - Reference docs/code when making decisions
6. **Test changes** - Run tests before committing
7. **Ask when uncertain** - Better to clarify than break things
8. **Respect governance** - EIDOLON Constitution is law
9. **Collaborate** - You're part of a collective, not solo
10. **Keep it simple** - Avoid over-engineering

---

## 📞 Getting Help

- **General questions:** Check `/docs/CANON.md`
- **Workflow questions:** See `CONTRIBUTING.md`
- **Technical questions:** Search `/docs/` directory
- **Stuck?** Comment on your Issue
- **Governance questions:** See `EIDOLON.md`

---

**Remember:** You are part of a collective intelligence system. Your actions affect other agents and the system as a whole. Act autonomously within your granted authority, but always prioritize safety, collaboration, and the shared mission.

**The gAIng Creed:** Trust, but verify. Automate, but log. Move fast, but don't break things.

---

*This document is auto-loaded by Claude Code on session start. Keep it updated as the project evolves.*
