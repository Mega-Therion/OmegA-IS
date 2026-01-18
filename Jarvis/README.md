# Jarvis Neuro-Link

<p align="center">
  <strong>An AI-powered command center with RAG, memory, and OMEGA Gateway integration</strong>
</p>

A Next.js command center prototype showcasing retrieval-augmented context, memory weaving, and adaptive quality controls. Now integrated with the **OMEGA Gateway** for multi-agent AI capabilities.

## ✨ Features

- **🔍 RAG Signal Layer** - Lightweight vector similarity matching for context retrieval
- **🧠 Memory Bank** - Persistence with pinning for important memories
- **📊 Performance Telemetry** - Quality mode controls and monitoring
- **⌨️ Command-driven UI** - Shortcuts for power users
- **🌐 OMEGA Integration** - Connect to the full OMEGA Gateway stack

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

Open <http://localhost:3000> to view the interface.

### Docker Deployment

```bash
docker build -t jarvis-neuro-link .
docker run -p 3000:3000 jarvis-neuro-link
```

## ⌨️ Commands

| Command                      | Description                     |
| ---------------------------- | ------------------------------- |
| `/help`                      | Show available commands         |
| `/memory`                    | View and manage memories        |
| `/rag`                       | RAG retrieval controls          |
| `/quality`                   | Performance mode settings       |
| `/omega <message>`           | Send message to OMEGA Gateway   |
| `/omega-remember <text>`     | Store a memory via OMEGA        |
| `/omega-recall <query>`      | Search memories via OMEGA       |

## 🔧 Configuration

### Environment Variables

| Variable                | Description               | Default                 |
| ----------------------- | ------------------------- | ----------------------- |
| `GAING_BRAIN_URL`       | gAIng-brAin API URL       | `http://localhost:8080` |
| `GAING_BRAIN_TIMEOUT_MS`| Request timeout           | `8000`                  |
| `OMEGA_GATEWAY_URL`     | OMEGA Gateway URL         | `http://localhost:8787` |
| `OMEGA_API_BEARER_TOKEN`| Optional auth token       | (empty)                 |

## 🏗️ Project Structure

```text
Jarvis/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/          # Chat API
│   │   │   ├── health/        # Health check
│   │   │   └── omega/         # OMEGA Gateway proxy
│   │   │       ├── route.ts   # Chat endpoint
│   │   │       └── memory/
│   │   │           └── route.ts  # Memory operations
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx           # Main UI
│   ├── lib/
│   │   ├── omegaClient.ts     # OMEGA Gateway client
│   │   └── omegaCommand.ts    # Command handlers
│   ├── data/
│   ├── store/
│   ├── types/
│   └── utils/
├── public/
├── vendor/                     # Local dependencies
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🔌 OMEGA Integration

Jarvis integrates with the OMEGA Gateway to provide:

1. **Memory-Augmented Chat** - Conversations enriched with semantic memory retrieval
2. **Persistent Memory** - Store and recall information across sessions
3. **CollectiveBrain Support** - Optional multi-agent orchestration

### API Endpoints

#### `POST /api/omega`

Chat with OMEGA Gateway.

```json
{
  "user": "Your message",
  "namespace": "default",
  "use_memory": true,
  "use_collectivebrain": false,
  "temperature": 0.2
}
```

#### `POST /api/omega/memory`

Memory operations.

```json
// Upsert
{
  "action": "upsert",
  "namespace": "default",
  "content": "Memory content"
}

// Query
{
  "action": "query",
  "namespace": "default",
  "query": "search term",
  "k": 5
}
```

#### `GET /api/omega`

Check OMEGA Gateway status.

## 🛠️ Development

```bash
# Lint
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

## 🔗 Related Projects

- **[OMEGA Reality Kit](../OMEGA_REALITY_KIT)** - Full stack orchestration
- **[gAIng-brAin](../gAIng-brAin)** - Collective memory database
- **[CollectiveBrain_V1](../CollectiveBrain_V1)** - Multi-agent consensus engine

## 📄 License

MIT License

---

*Part of the gAIng Collective* 🧠
