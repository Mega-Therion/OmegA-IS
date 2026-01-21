# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CollectiveBrain_V1** is a decentralized multi-agent collective intelligence system implementing Byzantine Fault Tolerant (BFT) consensus for orchestrating multiple specialized AI agents. It decomposes complex objectives into actionable sub-goals with multi-tier memory architecture.

## Architecture

**Core Pattern:** Orchestrator-Worker with DCBFT Consensus

```
Orchestrator → Decomposes objectives (LLM-powered)
     ↓
Workers → Execute tasks (Research, Finance, Analysis, Implementation)
     ↓
Memory Layer → 4-tier storage (Working, Session, Semantic, Relational)
     ↓
Consensus Engine → Byzantine Fault Tolerant voting (N >= 3f + 1)
```

**Tech Stack:**
- Language: Python 3.11+
- Framework: FastAPI (async)
- LLM: GitHub Models, OpenAI, Azure OpenAI
- Memory: Redis (session), Milvus (vectors), Neo4j (graphs)
- Deployment: Docker Compose

## Development Commands

```bash
# CLI Mode
python main.py orchestrate "Build a RAG pipeline"
python main.py consensus "Deploy to production"
python main.py status
python main.py deploy [basic|production] [--execute]

# API Mode
uvicorn api:app --host 0.0.0.0 --port 8000
# or: python api.py

# Testing
pytest tests/ -v --cov=.
pytest tests/ --cov-report=html

# Docker
docker build -t collectivebrain .
docker-compose up brain              # Basic mode
docker-compose --profile production up -d  # Full stack
```

## Core Components

**orchestrator.py** - Task decomposition engine
- `decompose_objective()` - Breaks objectives into 3-5 sub-goals
- `assign_to_worker()` - Routes tasks to specialized workers
- LLM-powered with template fallback

**worker_pool.py** - Agent pool management
- 4 worker roles: Research, Finance, Analysis, Implementation
- `WorkerAgent.execute_task()` - Executes assigned subtasks
- `WorkerPool.get_available_worker()` - Role-based selection

**memory_layer.py** - Four-tier memory system
- **WorkingMemory** - In-process deque with auto-pruning
- **SessionMemory** - Redis for real-time coordination (stub: dict)
- **SemanticMemory** - Milvus for vector search (stub: dict)
- **RelationalMemory** - Neo4j for graph queries (stub: dict)

**consensus_engine.py** - DCBFT Byzantine Fault Tolerance
- Formula: N >= 3f + 1 (N=agents, f=faulty agents tolerated)
- Quorum: ceil(N * 2/3) - 66% super-majority required
- `initiate_vote()`, `cast_vote()`, `tally_votes()`

**llm_client.py** - Multi-provider LLM abstraction
- Providers: GitHub Models (free), OpenAI, Azure OpenAI
- `LLMClient.complete()` - Unified completion interface
- `decompose_with_llm()` - Objective decomposition
- Fallback: Template-based when LLM unavailable

**api.py** - FastAPI REST interface
- Port: 8000
- 12 endpoints: orchestration, consensus, memory, workers
- CORS enabled, background task support

## Environment Variables

Required in `.env`:
```env
# LLM Provider (choose one)
GITHUB_TOKEN=ghp_xxx           # Recommended - free
OPENAI_API_KEY=sk-xxx          # Alternative
LLM_PROVIDER=github            # Options: github, openai, azure

# Production Memory Backends (optional)
REDIS_URL=redis://localhost:6379/0
MILVUS_HOST=localhost
MILVUS_PORT=19530
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

## API Endpoints

**Base URL:** `http://localhost:8000`

Key endpoints:
- `POST /orchestrate` - Decompose and execute objective
- `GET /orchestrate/{task_id}` - Get task status
- `POST /consensus/initiate` - Start DCBFT vote
- `POST /consensus/{decision_id}/vote` - Cast vote
- `POST /consensus/{decision_id}/tally` - Get consensus result
- `GET /status` - System health (workers, memory, tasks)
- `POST /memory/working` - Add memory entry
- `GET /workers` - List all workers and availability

**Authentication:** Currently open (no auth required)

## Key Files

- `main.py` - CLI entry point (orchestrate, consensus, deploy, status)
- `orchestrator.py` - Task decomposition engine (300 lines)
- `worker_pool.py` - Agent management (200 lines)
- `memory_layer.py` - 4-tier memory (300 lines)
- `consensus_engine.py` - DCBFT implementation (250 lines)
- `llm_client.py` - LLM abstraction (300 lines)
- `api.py` - FastAPI REST interface (400 lines)
- `deployment.py` - Docker orchestration (150 lines)

## Development Workflow

1. **Setup:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Add GITHUB_TOKEN to .env
   ```

2. **Test:**
   ```bash
   pytest tests/ -v
   python main.py status
   python main.py orchestrate "Test objective"
   ```

3. **Deploy:**
   ```bash
   docker-compose up brain  # Local
   docker-compose --profile production up -d  # Production
   ```

## Testing

**Test Suite (tests/test_brain.py):**
- 19 unit + integration tests
- Coverage: orchestrator, workers, memory, consensus, deployment
- Run: `pytest tests/ -v --cov=.`

**Integration Tests:**
```bash
python main.py status
python main.py orchestrate "Build a feature"
python main.py consensus "Approve deployment"
```

## Architecture Decisions

**DCBFT Consensus:**
- Prevents Byzantine agents from hijacking decisions
- 66% quorum ensures legitimacy
- Vote justifications tracked for audit

**Multi-Tier Memory:**
- Working: Fast, volatile (in-process)
- Session: Real-time (Redis - stub)
- Semantic: Vector search (Milvus - stub)
- Relational: Knowledge graphs (Neo4j - stub)

**LLM Fallback:**
- GitHub Models API (free with token)
- Falls back to templates when unavailable
- Ensures offline capability

## Code Standards

- Python 3.11+ type hints
- Docstrings for all public functions
- Follow PEP 8 style guide
- Test coverage > 80%
- Never commit secrets to `.env`

## CI/CD

**GitHub Actions (.github/workflows/ci.yml):**
1. Lint & Type Check (ruff, mypy)
2. Unit Tests (pytest with coverage)
3. Docker Build (multi-platform, GHCR push)
4. Release (on tag push)

**Triggers:** Push to main/develop, PRs to main

## Docker Deployment

**Dockerfile:** Multi-stage build
- Stage 1: Build dependencies
- Stage 2: Production runtime (non-root user)
- Health check: Imports Orchestrator

**docker-compose.yml:**
- `brain` - Main application
- `redis` - SessionMemory (production profile)
- `milvus` - SemanticMemory (production profile)
- `etcd` - Milvus dependency (production profile)
- `minio` - Object storage (production profile)

**Profiles:**
- Default: brain only (local dev)
- Production: full stack with Redis, Milvus, etcd, MinIO

## Known Limitations

**Stubs (Production Integration Needed):**
- SessionMemory: Uses dict instead of Redis
- SemanticMemory: Mock vectors instead of Milvus embeddings
- RelationalMemory: Basic node/edge storage instead of Neo4j

## Production Readiness

**Completed:**
- ✅ Core orchestration with LLM decomposition
- ✅ Worker pool with 4 specialized roles
- ✅ DCBFT consensus engine
- ✅ 4-tier memory layer (interfaces ready)
- ✅ Docker containerization
- ✅ CI/CD pipeline
- ✅ REST API interface

**Planned:**
- 🔲 Redis integration for SessionMemory
- 🔲 Milvus integration for SemanticMemory
- 🔲 Neo4j integration for RelationalMemory
- 🔲 Web dashboard UI
