# CANON: Single Source of Truth

**Status**: Living Document  
**Last Updated**: January 19, 2026  
**Owner**: Ryan (megas-DIO)  
**Purpose**: The definitive reference for all Omega/gAIng project decisions, standards, and constraints

---

## What is Canon?

The Canon is the **single source of truth** for the Omega project. When agents need to know:
- What decisions have been made
- What standards to follow
- What constraints exist
- What the project structure is

...they come here first.

## Project Overview

### Primary Goal
Create a **War Room** where Ryan dictates instructions **once** and the entire AI crew executes in coordination without repetition or divergence. The **Omega Trinity** architecture unifies the interface (Jarvis), intelligence (CollectiveBrain/Bridge), and memory (gAIng-brAin) into a single cohesive operating system.

### Repository / Structure
- **Root**: `omega` (Monorepo)
- **Core Components**:
    - `gateway`: Public ingress and API routing (Port 8787).
    - `Jarvis`: The primary HUD and interface (Next.js, Port 3001).
    - `bridge`: The CollectiveBrain API and LLM orchestration (Python, Port 8000).
    - `gAIng-brAin`: The long-term memory and execution core (Node.js, Port 8080).
- **Owner**: megas-DIO
- **Purpose**: Unified operating system for AI-human collaboration.

### AI Crew Members
- Safa (ChatGPT)
- Gemini
- Claude
- DeepSeek
- Perplexity
- Comet
- Grok
- Kimi
- Sora

## Architecture Decisions

### Core Stack (Omega Trinity)
- **Ingress**: Gateway (FastAPI/Uvicorn) serving as the single public entry point.
- **Frontend**: Jarvis (Next.js) + Legacy Portal (React/Vite).
- **Brain**: Bridge (CollectiveBrain) for LLM orchestration.
- **Memory**: Supabase (PostgreSQL) + Milvus (Vector DB) + Redis (Caching).
- **Automation**: N8N for workflow automation.
- **Infrastructure**: Docker Compose for containerized deployment.

### Why Monorepo?
1.  **Unified Context**: All components (UI, Brain, Memory) live in one place for easier cross-referencing.
2.  **Single Command Boot**: `pnpm omega` launches the entire stack.
3.  **Shared Types**: Shared TypeScript definitions between client and server.

## File Structure

```
omega/
├── .git/
├── bridge/                # CollectiveBrain API (Python)
├── client/                # Legacy Client (Vite + React)
├── gAIng-brAin/           # Memory & Execution Core (Node.js)
│   ├── docs/
│   │   ├── CANON.md       # This file - single source of truth
│   │   └── ...
│   └── ...
├── gateway/               # Public Ingress & Routing
├── Jarvis/                # Primary HUD (Next.js)
├── n8n/                   # Automation Workflows
├── server/                # Legacy Server (Express + tRPC)
├── shared/                # Shared Types & Constants
├── OMEGA_STACK.md         # Stack documentation
├── docker-compose.yml     # Production orchestration
└── .env                   # Single source of truth for secrets
```

## Coding Standards

### General Principles
1. **Clarity over cleverness**: Write code humans can understand.
2. **No premature optimization**: Make it work, then make it fast.
3. **Test critical paths**: Focus on core flows and integrations.
4. **Document why, not what**: Explain the intent behind the logic.

### Language-Specific

#### TypeScript/Node.js (Jarvis, gAIng-brAin, Gateway)
- Use strict typing.
- Prefer `const` over `let`.
- Async/Await for all asynchronous operations.

#### Python (Bridge/CollectiveBrain)
- Type hinting is mandatory.
- Use `pydantic` for data validation.
- Follow PEP 8 style guidelines.

## Git Workflow

### Branching Strategy
- `main` - Production-ready code.
- `feature/*` - New features.
- `fix/*` - Bug fixes.
- `docs/*` - Documentation updates.

### Commit Messages
- Imperative mood: "Add feature" not "Added feature".
- Reference issue numbers if applicable.

## Security & Privacy

### Sensitive Data
- **Never commit**: API keys, passwords, tokens.
- **Use `.env`**: A single root `.env` file drives the entire stack.
- **Supabase**: Use RLS policies to enforce data isolation.

## Decision Log

### 2026-01-19: Infrastructure Restoration
**Decision**: Restored Docker stack with Redis, Milvus, N8N, and Gateway.
**Rationale**: Stabilize the environment after rapid development and ensure all services communicate correctly.

### 2026-01-18: Omega Consolidation
**Decision**: Merged `Jarvis` and `CollectiveBrain_V1` into the `omega` core monorepo.
**Rationale**: Eliminate repository fragmentation and simplify the deployment pipeline.

### 2026-01-09: Multi-Platform Expansion
**Decision**: Finalized build targets for Mobile (Capacitor), Desktop (Electron), and Alexa.
**Rationale**: Ubiquitous access to the Omega system across all user contexts.

### 2026-01-04: GitHub as War Room Hub
**Decision**: Use GitHub Issues + Copilot Spaces as primary coordination mechanism.
**Rationale**: Native integration, familiar workflow.

## Constraints

### Hard Constraints (NEVER violate)
1. No work without a clear objective.
2. No committing secrets.
3. All API endpoints require authentication (Gateway handles this).
4. **The Block (`log.md`)** must be updated with major events.

---

**This is a living document. When in doubt, this is the source of truth.**