# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jarvis Neuro-Link** is an advanced AI command center built with Next.js 14 and TypeScript. It features retrieval-augmented generation (RAG), persistent memory management, voice control, and integration with multiple AI agents through gAIng-Brain and OMEGA Gateway backends.

## Architecture

**Tech Stack:**
- Framework: Next.js 14.2.5 (React 18.3.1)
- Language: TypeScript 5.4.5
- Styling: Tailwind CSS 3.4.4 (cyberpunk theme)
- State: Zustand 4.5.2 (with localStorage persistence)
- Animations: Framer Motion 11.0.0
- Voice: Web Speech Recognition API

**Key Features:**
- Command-driven UI with slash commands
- RAG (vector similarity for context retrieval)
- Memory bank with pinning
- Performance telemetry (FPS, latency, memory, mood)
- Multi-agent selection (Gemini, Claude, Codex, Grok)
- Voice recognition
- OMEGA Gateway integration

## Development Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build (standalone output)
npm run start      # Start production server
npm run lint       # Run ESLint

# Docker
docker build -t jarvis-neuro-link .
docker run -p 3000:3000 jarvis-neuro-link
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # Proxy to gAIng-Brain
│   │   ├── health/route.ts       # Health check
│   │   └── omega/
│   │       ├── route.ts          # OMEGA chat proxy
│   │       └── memory/route.ts   # OMEGA memory ops
│   ├── globals.css               # Tailwind + custom styles
│   ├── layout.tsx                # Root layout with SEO
│   └── page.tsx                  # Main UI (2K lines)
├── lib/
│   ├── omegaClient.ts            # OMEGA Gateway client
│   └── omegaCommand.ts           # OMEGA command handlers
├── store/
│   └── useNeuroStore.ts          # Zustand store
├── utils/
│   └── rag.ts                    # RAG implementation
├── data/
│   └── knowledge.ts              # Knowledge base docs
└── types/
    └── speech-recognition.d.ts   # SpeechRecognition types
```

## Environment Variables

Required in `.env.local`:
```env
# gAIng-Brain Backend
GAING_BRAIN_URL=http://localhost:8080
GAING_BRAIN_TIMEOUT_MS=8000

# OMEGA Gateway
OMEGA_GATEWAY_URL=http://localhost:8787
OMEGA_API_BEARER_TOKEN=            # Optional auth token
```

## API Routes

**Chat API (`/api/chat`):**
- Proxies to gAIng-Brain backend
- Validates requests (max 2000 chars, 6 context items)
- Timeout: 8 seconds
- Allowed agents: gemini, claude, codex, grok

**OMEGA Routes:**
- `POST /api/omega` - Chat via OMEGA Gateway
- `POST /api/omega/memory` - Memory upsert/query operations

**Health:**
- `GET /api/health` - Returns status and timestamp (Edge runtime)

## State Management

**Zustand Store (`src/store/useNeuroStore.ts`):**

State shape:
```typescript
{
  messages: ChatMessage[]           // Conversation history
  memory: MemoryItem[]              // Max 20 memories
  metrics: Metrics                  // Performance data
  ragEnabled: boolean               // RAG toggle
  qualityMode: 'ultra'|'balanced'|'lite'
}
```

**Persistence:**
- localStorage key: `'neuro-link-memory'`
- Only persists: messages, memory (not metrics)

## RAG Implementation

**Algorithm (`src/utils/rag.ts`):**
1. Build vocabulary from all documents
2. Vectorize query and documents (bag-of-words)
3. Calculate cosine similarity
4. Filter matches (score > 0)
5. Return top 3 results with highlights

**Knowledge Base (`src/data/knowledge.ts`):**
- 5 pre-loaded documents
- Covers: Neuro-Link, Memory Weaving, RAG, Optimization, Agent Orchestration
- Expandable for domain-specific knowledge

## UI Components

**Main UI (`src/app/page.tsx`):**
- Two-column layout (2:1 ratio on large screens)
- Left: Command stream (chat messages, input, voice)
- Right: RAG signal layer + Memory bank
- Quality modes: Ultra/Balanced/Lite
- Keyboard shortcuts: Ctrl+L (clear), Ctrl+/ (help)

**Features:**
- Real-time voice transcription
- Agent dropdown selection
- RAG toggle with relevance scores
- Memory pinning (max 20 items)
- Performance metrics display

## Styling

**Tailwind Configuration:**
- Custom cyberpunk color palette
- Cyber colors: `cyber-bg`, `cyber-primary`, `cyber-secondary`, `cyber-accent`
- Custom shadow: `glow` (cyan glow effect)
- Dark theme by default
- Glassmorphism effects

## OMEGA Integration

**Client (`src/lib/omegaClient.ts`):**
- `omegaChat()` - Send messages
- `omegaMemoryUpsert()` - Store memories
- `omegaMemoryQuery()` - Search memories

**Defaults:**
- namespace: "default"
- use_memory: true
- temperature: 0.2
- k: 8 (query limit)

## Configuration

**Next.js Config (`next.config.js`):**
- Output: standalone (Docker-optimized)
- Image optimization: AVIF/WebP
- Security headers: HSTS, X-Frame-Options, CSP-ready
- API rewrites: `/api/brain/*` proxy
- TypeScript strict mode

**Path Alias:**
- `@/*` → `src/*`

## Development Workflow

1. **Setup:**
   ```bash
   npm install
   cp .env.example .env.local
   # Configure backend URLs
   ```

2. **Development:**
   ```bash
   npm run dev  # Opens http://localhost:3000
   ```

3. **Production:**
   ```bash
   npm run build
   npm run start
   ```

## Key Features

**Command System:**
- `/help` - Show available commands
- `/memory` - View memory bank
- `/rag` - Toggle RAG mode
- `/quality` - Change quality mode

**Voice Control:**
- Browser Speech Recognition API
- Real-time transcription
- Toggle with microphone button

**RAG Flow:**
1. User query → Vector similarity matching
2. Retrieve top 3 documents with highlights
3. Context injection → Grounded response

**Memory:**
- Auto-persists to localStorage
- Manual pinning for important items
- Max 20 memories (auto-eviction)

## Docker Deployment

**Multi-Stage Build:**
1. Dependencies installation (node:20-alpine)
2. Application build
3. Production runner (non-root nodejs user)

**Expose:** Port 3000

**Build:**
```bash
docker build -t jarvis-neuro-link .
docker run -p 3000:3000 jarvis-neuro-link
```

## Code Standards

- TypeScript strict mode
- ESLint configured
- Prefer functional components
- Use Tailwind utility classes
- No console.log in production (except errors)

## Security

**Headers (next.config.js):**
- Strict-Transport-Security (HSTS)
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Permissions-Policy: camera disabled
- Referrer-Policy: origin-when-cross-origin

## Related Projects

Part of the gAIng Collective ecosystem:
- **OMEGA Reality Kit** - Full stack orchestration
- **gAIng-brAin** - Collective memory database
- **CollectiveBrain_V1** - Multi-agent consensus engine

## SEO & Metadata

**Layout (`src/app/layout.tsx`):**
- Title template: "%s | JARVIS"
- Keywords: AI, neuro-link, RAG, memory, agents
- Open Graph tags
- Twitter card
- PWA manifest

## Debugging

**Common Issues:**
- Check browser DevTools for SpeechRecognition errors
- Verify OMEGA_GATEWAY_URL is accessible
- Monitor console for API route errors
- Check localStorage: key `'neuro-link-memory'`

**Health Check:**
```bash
curl http://localhost:3000/api/health
```
