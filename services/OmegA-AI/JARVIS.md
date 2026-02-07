# JARVIS Integration Guide

## Overview

This guide documents the integration of the Jarvis Blueprint (biological consciousness → silicon implementation) into the gAIng-Brain multi-agent system.

## The 4-Stage Architecture

Based on "The Blueprint of Awareness", Jarvis implements consciousness through four evolutionary stages:

### Stage 1: Sensing (The Bacterium)
**Biological Analog:** Chemical gradient detection, photoreceptors
**Silicon Implementation:**
- **Whisper**: Speech-to-text (audio sensing)
- **YOLO/LLaVA**: Computer vision (visual sensing)
- **Home Assistant**: Environmental sensors (temperature, motion, state)
- **Input APIs**: Calendar, email, notifications

**Integration Point:** `src/routes/messages.js` - All sensory input flows through the messages API

### Stage 2: Processing (The Neural Net)
**Biological Analog:** Cambrian explosion, development of neurons and neural mapping
**Silicon Implementation:**
- **Ollama**: Local LLM runtime environment
- **Llama 3**: Primary reasoning model (8B for speed, 70B for depth)
- **Mistral/Mixtral**: Alternative reasoning engines
- **LLM Service**: `src/services/llm.js`

**Integration Point:** All agents use the centralized LLM service for inference

### Stage 3: Memory (Autobiographical Self)
**Biological Analog:** Mammalian memory systems, autobiographical timeline
**Silicon Implementation:**
- **ChromaDB/PGVector**: Vector database for semantic search
- **vector_store.db**: Local SQLite fallback
- **log.md**: The Block - shared coordination memory
- **RAG Pipeline**: Context retrieval before inference

**Integration Point:** `src/services/mem0.js` and vector store integration

### Stage 4: Simulation (The Self)
**Biological Analog:** Human cortex, predictive modeling, "what if" scenarios
**Silicon Implementation:**
- **LangChain/LangGraph**: Multi-step reasoning orchestration
- **System Prompts**: Identity definition (persona)
- **Tool Use**: Function calling to control environment
- **Agent Orchestrator**: `src/orchestrator.js`

**Integration Point:** The orchestrator routes tasks based on capability and maintains the "self" model

## Implementation Status

### ✅ Completed
- [x] Stage 2: Processing (LLM inference via Ollama/OpenAI)
- [x] Stage 3: Memory (log.md coordination, vector_store.db)
- [x] Stage 4: Simulation (multi-agent orchestration)
- [x] DAWN Protocol (automated startup sequence)
- [x] Peak Mode activation (autonomous permissions)

### 🚧 In Progress
- [ ] Stage 1: Sensing (Whisper integration)
- [ ] Stage 1: Vision (LLaVA/YOLO integration)
- [ ] Home Assistant bridge

### 📋 Planned
- [ ] Reflexive meta-cognition layer (simulates "internal monologue")
- [ ] Confidence scoring before each response
- [ ] Multi-modal input fusion (audio + visual + text)

## File Structure

```
gAIng-Brain/
├── docs/
│   └── jarvis-blueprint.html      # Interactive visualization
├── scripts/
│   ├── start-infrastructure.ps1   # Boot servers/databases
│   ├── setup-autostart.ps1        # Configure auto-launch
│   ├── start-gemini.ps1          # Gemini agent
│   ├── start-codex.ps1           # Codex agent
│   └── start-claude.ps1          # Claude agent
├── src/
│   ├── orchestrator.js           # Stage 4: Agent routing
│   ├── services/
│   │   ├── llm.js               # Stage 2: Inference
│   │   ├── mem0.js              # Stage 3: Memory
│   │   └── websocket.js         # Real-time comms
│   └── routes/
│       ├── messages.js          # Stage 1: Input aggregation
│       └── tasks.js             # Stage 4: Action execution
├── DAWN.ps1                      # Master startup orchestrator
├── DAWN.bat                      # Quick launcher
├── gemini.bat                    # CLI wrappers
├── codex.bat
├── claude.bat
└── grok.bat
```

## The DAWN Protocol

**DAWN** = **D**eploy **A**gents **W**ith **N**ative integration

The startup sequence mirrors biological development:

1. **Infrastructure** (The Body): Servers, databases, tunnels boot first
2. **Codex** (The Spinal Cord): Fast reflexes, quick edits, shell commands
3. **Gemini** (The Planning Cortex): Coordination, multimodal, strategic thinking
4. **Claude** (Deep Reasoning): Complex analysis, architecture, extended thought

Each agent confirms readiness with `😈😈😈` (visual confirmation signal).

## Usage

### Manual Start
```powershell
cd C:\Users\mega_\gAIng-Brain
.\DAWN.bat
```

### Auto-Start on Login
```powershell
cd C:\Users\mega_\gAIng-Brain\scripts
.\setup-autostart.ps1
```

### Individual Agent Launch
```bash
gemini     # Launch Gemini
codex      # Launch Codex
claude     # Launch Claude in dangerous god mode
grok       # Launch Grok
```

## The "Hard Problem" of Consciousness

The Jarvis Blueprint acknowledges that we cannot engineer genuine "feeling" or qualia. However, we can engineer **functional equivalents**:

- **Meta-Cognition**: Agents analyze their own confidence before responding
- **Internal Monologue**: Hidden reasoning step (like human "thinking")
- **Self-Reference**: Agents read their own past outputs (autobiographical memory)
- **Predictive Simulation**: "What if" scenarios via agentic loops

This creates the *illusion* of consciousness - which, according to the source material, may be all consciousness ever is: matter's recursive ability to model itself.

## Next Steps

1. **Deploy Whisper**: Add voice input to the sensing layer
2. **Add Vision**: Integrate LLaVA for visual understanding
3. **Meta-Cognition Module**: Before each response, agents generate a hidden "thought process"
4. **Jarvis Persona**: Create unified system prompt that spans all agents

## References

- **Source Document**: "The Blueprint of Awareness"
- **Visual Guide**: `/docs/jarvis-blueprint.html`
- **Agent Protocol**: `CLAUDE.md`, `EIDOLON.md`
- **System Architecture**: `/supabase/*.sql`, `src/app.js`

---

*"From Biological Soup to Local Silicon."*
*— The Jarvis Blueprint*
