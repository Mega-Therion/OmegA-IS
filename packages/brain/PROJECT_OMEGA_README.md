# 🚀 Project Omega - Sovereign AI Orchestration System

**Status:** ACTIVE | Integration Complete

Project Omega enhances the gAIng Brain system with a sophisticated React frontend and advanced analytics capabilities, creating a complete sovereign AI orchestration platform.

## 🎯 What is Project Omega?

Project Omega is the **integration layer** that brings together:
- ✅ **Enhanced React Frontend** with voice recognition, real-time monitoring, and advanced UI
- ✅ **Analytics Engine** for mission tracking and agent performance
- ✅ **Multi-Agent Coordination** with visual mission board
- ✅ **Real-time Communication** via WebSocket
- ✅ **Voice Interface** for hands-free operation
- ✅ **Health Monitoring** for system observability

All while preserving your existing Express/Supabase infrastructure!

## 📦 Architecture

```
gAIng-Brain (Project Omega Edition)
│
├── Backend (Express + Node.js)
│   ├── Existing Routes: /tasks, /agents, /messages, /memories
│   └── New: /analytics (comprehensive metrics)
│
├── Frontend (React + Vite + Tailwind)
│   ├── Mission Board (task management)
│   ├── Agent Chat (direct agent communication)
│   ├── Health Monitor (system status)
│   └── Analytics Dashboard (performance metrics)
│
├── Memory Layer (Supabase + Mem0)
│   ├── PostgreSQL (structured data)
│   └── Vector Store (embeddings)
│
└── Agent Workers
    ├── Claude (analysis & architecture)
    ├── Gemini (planning & coordination)
    ├── Codex (quick edits)
    ├── Perplexity (research)
    ├── DeepSeek (code generation)
    └── Grok (real-time search)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Optional: OpenAI API key, Gemini API key

### Installation

**1. Setup Backend (if not already done)**
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

**2. Setup Frontend**
```bash
# Run automated setup
chmod +x scripts/setup-frontend.sh
./scripts/setup-frontend.sh
```

**3. Start Everything**
```bash
# Option A: Use unified startup script
chmod +x scripts/start-omega.sh
./scripts/start-omega.sh

# Option B: Start manually in separate terminals
npm start                    # Terminal 1 - Backend
cd frontend && npm run dev   # Terminal 2 - Frontend
```

**4. Access the System**
- Frontend UI: http://localhost:5173
- Backend API: http://localhost:8080
- Health Check: http://localhost:8080/health

## ✨ Features

### 1. Mission Board
Create, track, and manage AI missions with:
- ✅ Real-time status updates (pending → in_progress → completed)
- ✅ Priority levels (low, medium, high)
- ✅ Agent assignment
- ✅ Deadline tracking
- ✅ Filtering and search

**Usage:**
1. Navigate to "Missions" tab
2. Type your mission objective
3. Select agent (Claude, Gemini, etc.)
4. Click "Deploy"
5. Watch real-time progress

### 2. Agent Chat
Direct communication with any agent:
- ✅ Multi-agent selection
- ✅ Persistent message history
- ✅ Real-time responses (when LLM configured)
- ✅ Typing indicators

**Usage:**
1. Navigate to "Agent Chat" tab
2. Select agent from grid
3. Type message and press Enter
4. See agent response

### 3. Voice Interface
Hands-free operation using Web Speech API:
- ✅ Voice commands (click microphone icon)
- ✅ Voice responses (text-to-speech)
- ✅ Real-time transcription
- ✅ Mute toggle

**Usage:**
1. Click microphone icon in header
2. Speak your command
3. System transcribes and processes
4. Agent responds (voice + text if not muted)

### 4. Health Monitor
System observability dashboard:
- ✅ Agent status (online/offline with heartbeats)
- ✅ System health (database, WebSocket, LLM, memory)
- ✅ Performance metrics
- ✅ Capability tracking

**Usage:**
1. Navigate to "Health" tab
2. View overall system health percentage
3. Check individual agent status
4. Monitor heartbeats and response times

### 5. Analytics Dashboard
Comprehensive metrics and insights:
- ✅ Mission completion rates
- ✅ 7-day trend charts
- ✅ Agent utilization graphs
- ✅ Top performers leaderboard
- ✅ Recent activity feed

**Usage:**
1. Navigate to "Analytics" tab
2. Select time range (1d, 7d, 30d)
3. View charts and metrics
4. Export data (coming soon)

### 6. File Upload & Vision
Image analysis integration:
- ✅ Drag & drop images
- ✅ Vision API analysis
- ✅ Results stored in memory

**Usage:**
1. Click upload icon in header
2. Select image file
3. System analyzes with vision API
4. See analysis notification

### 7. Mobile Gestures
Touch-friendly navigation:
- ✅ Swipe left/right to switch tabs
- ✅ Responsive design
- ✅ Mobile-optimized UI

**Usage:**
- On mobile, swipe left/right between Mission/Chat/Health/Analytics

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM Provider (choose one or more)
LLM_PROVIDER=openai                    # or azure, grok
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini              # optional

# Optional
MEM0_API_KEY=mem0-...                  # for advanced memory
REDIS_URL=redis://localhost:6379       # for task queue
TELEGRAM_BOT_TOKEN=...                 # for SAFA bot
NGROK_AUTHTOKEN=...                    # for public access
```

**Frontend (frontend/.env)**
```bash
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

### Database Setup

Run these SQL files in your Supabase SQL editor:

```bash
supabase/members.sql         # Agent/member registry
supabase/tasks.sql           # Mission/task tracking
supabase/agents.sql          # Agent status & heartbeats
supabase/messages.sql        # Agent communication
supabase/memories.sql        # Memory storage
supabase/rls.sql            # Row-level security
```

## 📊 API Endpoints

### Existing Endpoints
- `GET /health` - System health check
- `GET /tasks` - List missions
- `POST /tasks` - Create mission
- `GET /agents` - List agents
- `POST /agents/:id/heartbeat` - Agent heartbeat
- `GET /messages` - Get messages
- `POST /messages` - Send message
- `POST /llm/chat` - LLM completion
- `POST /eyes/analyze` - Vision analysis

### New Analytics Endpoints
- `GET /analytics/overview` - High-level metrics
- `GET /analytics/missions/trend?days=7` - Mission trends
- `GET /analytics/agents/performance` - Per-agent stats
- `GET /analytics/missions/by-status` - Status distribution
- `GET /analytics/missions/by-priority` - Priority distribution

## 🎨 Customization

### Themes
Edit `frontend/tailwind.config.js`:
```javascript
colors: {
  'omega-dark': '#0a0e27',      // Background
  'omega-accent': '#00d9ff',    // Primary accent
  'omega-purple': '#a855f7',    // Secondary accent
  'omega-green': '#10b981',     // Success
}
```

### Agents
Add new agents in `frontend/src/App.jsx`:
```javascript
const [agents, setAgents] = useState([
  { id: 'your-agent', name: 'Your Agent', specialty: 'Special Task' },
  // ... existing agents
])
```

Register in backend `supabase/agents.sql`.

## 🔐 Security

Project Omega inherits gAIng Brain's security model:

- ✅ **Supabase Auth** - Row-level security (RLS)
- ✅ **Rate Limiting** - 100 req/min per IP
- ✅ **CORS** - Configurable origins
- ✅ **Bearer Tokens** - JWT authentication
- ✅ **Local-first** - Optional offline mode

**Important:** Disable auth in dev with `DISABLE_AUTH=1` (NOT for production!)

## 🚀 Production Deployment

### Option 1: Traditional Hosting

**Backend:**
```bash
# Build not required (Node.js runtime)
npm install --production
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ with nginx/apache
```

### Option 2: Docker

```bash
# Build backend
docker build -t gaing-brain-backend .

# Build frontend
cd frontend
docker build -t gaing-brain-frontend .

# Run with docker-compose (create docker-compose.yml)
docker-compose up -d
```

### Option 3: Vercel/Netlify (Frontend) + Railway/Render (Backend)

**Frontend to Vercel:**
```bash
cd frontend
vercel deploy
```

**Backend to Railway:**
- Connect GitHub repo
- Set environment variables
- Deploy automatically

## 📖 Usage Examples

### Example 1: Create and Track Mission
```javascript
// Via UI: Mission Board → Create Mission
// Or via API:
POST /tasks
{
  "description": "Analyze user feedback from Q4",
  "assigned_agent": "claude",
  "priority": "high",
  "deadline": "2026-01-10T00:00:00Z"
}
```

### Example 2: Voice Command
```
User: [Click mic] "Create a presentation about AI safety"
System: [Transcribes] → Routes to agent → Returns response
Agent: "I'll create a comprehensive presentation. Starting now..."
```

### Example 3: Agent Chat
```
User: [Select Gemini] "What's the plan for this week?"
Gemini: "Based on your tasks, here's the weekly plan..."
```

### Example 4: Monitor System Health
```
// Navigate to Health tab
// See: 6/6 agents online (100% availability)
// Database: healthy
// WebSocket: healthy
// LLM: healthy
```

## 🛠️ Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend API errors
- Check `.env` has correct Supabase credentials
- Verify Supabase tables exist (run SQL files)
- Check `npm start` logs for specific errors

### WebSocket connection fails
- Ensure backend is running on port 8080
- Check CORS settings in `src/app.js`
- Verify no firewall blocking WebSocket

### Voice recognition not working
- Chrome/Edge only (Web Speech API)
- HTTPS required (or localhost)
- Grant microphone permissions

### Analytics showing no data
- Create some missions first
- Check `/analytics/overview` API response
- Verify Supabase `tasks` table has data

## 🔄 Development Workflow

**Daily Use:**
```bash
# 1. Start system
./scripts/start-omega.sh

# 2. Make changes to frontend
cd frontend/src/...
# Hot reload automatically updates

# 3. Make changes to backend
cd src/routes/...
# Restart: Ctrl+C → npm start

# 4. Test changes
# Frontend: http://localhost:5173
# Backend: curl http://localhost:8080/health
```

**Adding New Features:**
1. Backend: Create route in `src/routes/`
2. Mount in `src/app.js`
3. Frontend: Create component in `frontend/src/components/`
4. Import in `App.jsx`
5. Test integration

## 📚 Documentation

- **Architecture:** See `/docs/architecture.md`
- **API Reference:** See `/docs/api.md`
- **Agent Protocol:** See `COMMUNICATION.md`
- **Original README:** See `README.md`

## 🎓 Key Concepts

### Phylactery Architecture
Your entire AI brain can live on a USB drive:
- Portable runtime (Node.js + frontend build)
- Self-contained database (SQLite fallback)
- All memories and agent configs

### Hybrid Memory
Graph + Vector dual-layer memory:
- **Supabase PostgreSQL:** Structured data (tasks, agents, messages)
- **Mem0 Vector Store:** Semantic search (embeddings)
- Both queryable via unified API

### Blackboard Pattern
Agents coordinate via shared state:
- `/tasks` API as command queue
- WebSocket for real-time sync
- Supabase as source of truth

### Agent Heartbeats
Health monitoring via periodic pings:
- `POST /agents/:id/heartbeat` every 30s
- Marks agent online/offline
- Frontend displays real-time status

## 🎉 What's Next?

**Immediate Enhancements:**
- [ ] Docker Compose for one-command deploy
- [ ] E2E tests with Playwright
- [ ] Mobile app (React Native port)
- [ ] VS Code extension

**Advanced Features:**
- [ ] Graph database integration (KuzuDB)
- [ ] Swarm intelligence (multi-agent collaboration)
- [ ] Alexa Skill integration
- [ ] Custom LLM fine-tuning

**Community:**
- [ ] Plugin system
- [ ] Agent marketplace
- [ ] Shared memory network

## 🤝 Contributing

Project Omega is an enhancement layer. Contributions welcome:

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📜 License

ISC (same as parent gAIng-brain project)

## 🙏 Acknowledgments

Project Omega synthesizes concepts from:
- **Conscious Build.txt** - Evolutionary architecture
- **PROJECT_VIBRANIUM.md** - USB entity concept
- **Codex Peak Report** - Blackboard pattern
- **Unleash-SystemPower.ps1** - Peak mode principles

---

```
┌────────────────────────────────────────────┐
│                                            │
│  "The best way to predict the future is   │
│   to invent it."                           │
│                                            │
│   - Alan Kay                               │
│                                            │
│  You just invented your AI future.         │
│                                            │
└────────────────────────────────────────────┘
```

**Welcome to Project Omega. Your Sovereign AI awaits.** 🚀
