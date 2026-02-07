# 🌌 OMEGA - Unified AI Agent System

OMEGA is now a **single unified codebase** - no more separate packages!

## Quick Start

```bash
# Start OMEGA
npm run omega

# Or simply
npm start
```

## Core Modules

All functionality is now in `packages/brain/src/core/`:

| Module | Description |
|--------|-------------|
| `consensus-engine.js` | DCBFT protocol for agent voting |
| `memory-layer.js` | Working, Session, Semantic, Relational memory |
| `worker-pool.js` | Agent task execution |
| `llm-client.js` | Multi-provider LLM integration |
| `index.js` | Central exports with singletons |

## Commands

| Command | Description |
|---------|-------------|
| `npm run omega` | Start OMEGA core |
| `npm run omega:hud` | Start frontend dashboard |
| `npm run omega:crew` | Start AI crew Telegram bots |
| `npm run omega:safa` | Start Safa task intake bot |
| `npm run omega:doctor` | Health diagnostics |

## Using the Core

```javascript
const { 
    getLLM, 
    getMemory, 
    getConsensus, 
    getWorkerPool,
    getOmegaStatus,
    decomposeWithLLM
} = require('./src/core');

// Get LLM client for any provider
const gemini = getLLM('gemini');
const claude = getLLM('anthropic');

// Use shared memory
const memory = getMemory();
memory.working.addEntry({ type: 'task', content: 'Do something' });

// Decompose objectives with AI
const goals = await decomposeWithLLM('Build a chat app');

// Get system status
console.log(getOmegaStatus());
```

## Configuration

Single `.env` file at project root contains all configuration.

## LLM Providers

- ✅ OpenAI (GPT-4, Codex)
- ✅ Anthropic (Claude)
- ✅ Google (Gemini)
- ✅ xAI (Grok)
- ✅ DeepSeek
- ✅ Perplexity
- ✅ GitHub Models
