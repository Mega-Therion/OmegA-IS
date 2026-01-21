# OMEGA Platform - Multi-Platform Ecosystem

> **One Brain, Every Interface** - Access your OmegAI through any platform.

## 🌐 Platform Overview

| Platform | Technology | Status | Description |
|----------|------------|--------|-------------|
| **Web App** | Next.js (Jarvis) + Vite (Vision) | ✅ Ready | Full-featured web dashboard |
| **Mobile App** | Capacitor + PWA | 🔨 Building | iOS & Android native apps |
| **Desktop App** | Electron | 🔨 Building | Windows, Mac, Linux |
| **Alexa Skill** | AWS Lambda | 🔨 Building | Voice control via Echo devices |
| **CLI** | Node.js | 🔨 Building | Terminal interface |
| **Portable USB** | OMEGA-OS | 🔨 Building | Bootable Linux distro |

---

## 🏗️ Architecture

All platforms connect to the central **gAIng-Brain API**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        gAIng-Brain API                          │
│  • REST Endpoints (/api/*)                                      │
│  • WebSocket (/ws, /realtime)                                   │
│  • Agent Routing (Gemini, Claude, Codex, Grok)                  │
│  • Memory Layer (Supabase + Mem0)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐             ┌─────────┐             ┌─────────┐
│   Web   │◄───────────►│ Mobile  │◄───────────►│ Desktop │
│  Jarvis │             │   App   │             │   App   │
└─────────┘             └─────────┘             └─────────┘
    │                         │                         │
    └─────────────────────────┼─────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐             ┌─────────┐             ┌─────────┐
│  Alexa  │             │   CLI   │             │ USB/OS  │
│  Skill  │             │ omega   │             │ OMEGA-OS│
└─────────┘             └─────────┘             └─────────┘
```

---

## 📦 Quick Start

### All Platforms
```bash
# Clone the ecosystem
git clone https://github.com/megas-DIO/gAIng-brAin.git
cd gAIng-brAin

# Install dependencies
npm install

# Start the brain
npm start
```

### Individual Platforms

| Platform | Command | Port/Location |
|----------|---------|---------------|
| Web (Jarvis) | `cd Jarvis && npm run dev` | http://localhost:3001 |
| Web (Vision) | `cd frontend && npm run dev` | http://localhost:5173 |
| Mobile | `cd mobile && npx cap run android` | Device/Emulator |
| Desktop | `cd desktop && npm start` | Native window |
| Alexa | `cd alexa-skill && npm run deploy` | AWS Lambda |
| CLI | `npm install -g @omega/cli` | Terminal |

---

## 🔗 API Endpoints

All platforms use these unified endpoints:

```
POST /chat          - Send message to agents
POST /voice         - Voice-to-text processing  
GET  /health        - System status
GET  /agents        - List available agents
POST /missions      - Create/manage missions
GET  /memory        - Access brain memory
WS   /ws            - Real-time connection
WS   /realtime      - OpenAI Realtime API
```

---

## 📂 Directory Structure

```
gAIng-Brain/
├── Jarvis/              # Web App (Next.js)
├── frontend/            # Vision Dashboard (Vite)
├── mobile/              # Mobile App (Capacitor)
├── desktop/             # Desktop App (Electron)
├── alexa-skill/         # Alexa Custom Skill
├── cli/                 # Command Line Interface
├── omega-os/            # Portable USB Distribution
├── src/                 # Shared backend
└── docs/                # Documentation
```

---

## 🎯 Platform Details

### 1. Web Application (Jarvis + Vision)
- **Jarvis**: Full-featured neuro-link interface with RAG
- **Vision**: Mission control dashboard with 3D visualizations
- **PWA**: Installable on any device

### 2. Mobile Application
- Native iOS and Android apps
- Voice input with Web Speech API
- Push notifications for mission updates
- Offline mode with sync

### 3. Desktop Application
- Windows, macOS, Linux support
- System tray integration
- Global hotkeys
- Native notifications

### 4. Alexa Skill
- "Alexa, ask Omega Brain..."
- Voice-to-brain communication
- Mission status reports
- Agent conversations

### 5. Command Line Interface
- `omega chat "message"` - Quick chat
- `omega mission create` - Create missions
- `omega status` - System status
- `omega agents` - List agents

### 6. Portable USB (OMEGA-OS)
- Bootable Linux distribution
- Pre-configured with all tools
- Secure, air-gapped operation
- Persistent storage option

---

*Built by the gAIng Collective* 🧠
