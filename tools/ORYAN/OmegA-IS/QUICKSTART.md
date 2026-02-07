# OMEGA-Trinity Deployment Guide

Complete guide to deploy and run OMEGA-Trinity as a working product.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Service Configuration](#service-configuration)
- [Health Monitoring](#health-monitoring)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

OMEGA-Trinity consists of three main services:

```
┌─────────────────────────────────────────────────────────────┐
│                      OMEGA-Trinity Stack                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Gateway    │◄──►│    Brain     │◄──►│    Bridge    │ │
│  │  (Node.js)   │    │  (Node.js)   │    │   (Python)   │ │
│  │   Port 8787  │    │   Port 8080  │    │   Port 8000  │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬────────┘ │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          Infrastructure Services                    │  │
│  │  Redis │ Milvus │ Neo4j │ PostgreSQL │ Prometheus │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Python** >= 3.11
- **Docker** >= 24.0 (for containerized deployment)
- **Docker Compose** >= 2.20
- **Git**

### Required API Keys

1. **Supabase** (for Brain memory storage)
   - Project URL
   - Service Role Key
   - Anon Key

2. **AI Providers** (choose one or more)
   - OpenAI API Key
   - Anthropic API Key
   - Google Gemini API Key
   - Grok API Key

3. **Optional Services**
   - Mem0 API Key (for advanced memory)
   - ngrok Auth Token (for public access)

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/Mega-Therion/OMEGA-Trinity.git
cd OMEGA-Trinity

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# 3. Start all services
docker-compose up -d

# 4. Verify services are running
docker-compose ps

# 5. Check logs
docker-compose logs -f
```

### Option 2: Local Development

```bash
# 1. Clone repository
git clone https://github.com/Mega-Therion/OMEGA-Trinity.git
cd OMEGA-Trinity

# 2. Install Node.js dependencies
npm install

# 3. Install Python dependencies for Bridge
cd packages/bridge
pip install -r requirements.txt
cd ../..

# 4. Set up environment variables
cp .env.example .env
cp packages/brain/.env.example packages/brain/.env
cp packages/bridge/.env.example packages/bridge/.env
cp gateway/.env.example gateway/.env

# Edit each .env file with your configuration

# 5. Start all services (from root)
npm run dev
```

## Development Deployment

### Starting Individual Services

#### Gateway Service (Port 8787)

```bash
cd gateway
npm install
npm run dev
```

#### Brain Service (Port 8080)

```bash
cd packages/brain
npm install
npm start
```

#### Bridge Service (Port 8000)

```bash
cd packages/bridge
pip install -r requirements.txt
python main.py
# or
uvicorn main:app --reload --port 8000
```

### Service Health Checks

After starting all services, verify they're running:

```bash
# Gateway
curl http://localhost:8787/health

# Brain
curl http://localhost:8080/health

# Bridge
curl http://localhost:8000/health
```

## Production Deployment

### Using Production Docker Compose

```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Node Environment
NODE_ENV=production

# Gateway Configuration
GATEWAY_PORT=8787
BRAIN_URL=http://brain:8080
BRIDGE_URL=http://bridge:8000

# Brain Configuration
BRAIN_PORT=8080
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
MEM0_API_KEY=your_mem0_key

# Bridge Configuration
BRIDGE_PORT=8000

# AI Provider Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
GROK_API_KEY=your_grok_key

# Optional: ngrok
ENABLE_NGROK=0
NGROK_AUTHTOKEN=your_ngrok_token
```

## Service Configuration

### Gateway (API Routing Layer)

**Purpose**: Routes requests to Brain and Bridge services

**Endpoints**:
- `GET /health` - Health check
- `POST /api/brain/*` - Proxy to Brain
- `POST /api/bridge/*` - Proxy to Bridge

### Brain (Memory & Orchestration)

**Purpose**: Manages collective memory and agent coordination

**Key Features**:
- Memory storage in Supabase
- Multi-agent orchestration
- Telegram bot integration
- WebSocket support

**Endpoints**:
- `GET /health` - Health check
- `POST /memories` - Create memory
- `GET /memories` - List memories
- `GET /memories/search` - Search memories
- `POST /members` - Register member
- `POST /llm/chat` - LLM chat proxy

### Bridge (Python AI Backend)

**Purpose**: Python-based AI processing with TensorFlow, transformers, LangChain

**Key Features**:
- DCBFT consensus protocol
- Worker pool management
- LLM client integration
- Advanced AI/ML processing

**Endpoints**:
- `GET /health` - Health check
- `POST /process` - Process AI task
- `POST /consensus` - Consensus operation

## Health Monitoring

### Automated Health Checks

Create a monitoring script `scripts/health-check.sh`:

```bash
#!/bin/bash

echo "Checking OMEGA-Trinity services..."

# Check Gateway
if curl -f http://localhost:8787/health > /dev/null 2>&1; then
    echo "✅ Gateway is healthy"
else
    echo "❌ Gateway is down"
fi

# Check Brain
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Brain is healthy"
else
    echo "❌ Brain is down"
fi

# Check Bridge
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Bridge is healthy"
else
    echo "❌ Bridge is down"
fi
```

### Monitoring with Prometheus & Grafana

Prometheus and Grafana are included in `docker-compose.prod.yml`:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check if ports are already in use
netstat -ano | findstr :8787
netstat -ano | findstr :8080
netstat -ano | findstr :8000

# Kill processes if needed
taskkill /PID <pid> /F
```

#### Database Connection Issues

- Verify Supabase credentials in `.env`
- Check Supabase project is active
- Run SQL migrations in `packages/brain/supabase/`

#### Memory Issues

```bash
# Check Docker resources
docker stats

# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory
```

#### Python Dependencies

```bash
# Reinstall Bridge dependencies
cd packages/bridge
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Logs

```bash
# Docker logs
docker-compose logs -f [service-name]

# Local logs
# Gateway: gateway/logs/
# Brain: packages/brain/logs/
# Bridge: packages/bridge/logs/
```

## Next Steps

1. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
2. Check [README.md](./README.md) for feature documentation
3. See [ENHANCEMENTS_FROM_REPOS.md](./ENHANCEMENTS_FROM_REPOS.md) for integration roadmap
4. Configure CI/CD workflows in `.github/workflows/`

## Support

For issues or questions:
- [GitHub Issues](https://github.com/Mega-Therion/OMEGA-Trinity/issues)
- [Discussions](https://github.com/Mega-Therion/OMEGA-Trinity/discussions)

---

**Built with 💜 by the gAIng Collective**
