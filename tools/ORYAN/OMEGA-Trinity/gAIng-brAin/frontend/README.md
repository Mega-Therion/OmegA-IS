# Project Omega - Frontend

React + Vite + Tailwind CSS frontend for the gAIng Brain sovereign AI system.

## Features

- 🎯 **Mission Board** - Create and track AI missions
- 💬 **Agent Chat** - Direct communication with AI agents
- 🔊 **Voice Interface** - Hands-free operation with Web Speech API
- 📊 **Analytics Dashboard** - System metrics and performance
- 🏥 **Health Monitor** - Real-time agent status
- 📱 **Mobile Gestures** - Swipe navigation
- 🎨 **Modern UI** - Tailwind CSS with sci-fi theme

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

Create `.env` file:

```env
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

## Project Structure

```
src/
├── App.jsx                    # Main application
├── main.jsx                   # Entry point
├── index.css                  # Global styles
└── components/
    ├── MissionBoard.jsx       # Task management
    ├── AgentChat.jsx          # Agent communication
    ├── HealthMonitor.jsx      # System health
    ├── Analytics.jsx          # Metrics dashboard
    └── VoiceInterface.jsx     # Voice controls
```

## Development

- Vite provides fast HMR (Hot Module Replacement)
- ESLint configured for React
- Tailwind for utility-first CSS
- Recharts for data visualization

## Browser Support

- Chrome/Edge (recommended for voice features)
- Firefox (limited voice support)
- Safari (basic features only)

Modern browsers with ES2020 support required.

## See Also

- Main README: `/PROJECT_OMEGA_README.md`
- Backend API: `http://localhost:8080`
