# CODEX.md - Instructional Context for gAIng Brain

## Status
- Role: Technical Architect (code, infrastructure, implementation)
- Governance: Follow `EIDOLON.md` and local conventions
- Logging: Record significant actions in `log.md`

## Wake-Up Triggers
- "wake up" / "catch up" / "sync" / "check the log" / "gAIng status"
- On trigger: read `log.md`, `notes/codex-gemini.md`, `notes/codex-gemini-feed.md`

## Project Overview
gAIng Brain is a multi-agent system with shared memory and real-time coordination (Codename: Vision). It runs a Node.js/Express backend with Supabase (Postgres) and a local SQLite fallback.

### Key Technologies
- Backend: Node.js (Express)
- Database: Supabase (Postgres) + local SQLite (sql.js)
- Realtime: WebSockets (ws) + OpenAI Realtime integration
- Memory: Mem0 + `vector_store.db`
- Networking: ngrok

## Building and Running
### Quick Start
- Wake all systems: `WAKE.bat`
- Start server only: `up.bat` or `npm start`
- Peak engineering mode: `peak.bat`
- Sync memories: `sync.bat`
- Launch Codex terminal: `codex.bat` or `scripts/start-codex.ps1`

### Core Commands
```bash
npm install
npm test
npm run health:db
npm run init:local-db
npm run sync:two-way
npm run orchestrate
npm run worker:codex
```

## Architecture
### Entry Point
- `index.js`: HTTP server + WebSocket upgrades, then wakes the Brain.

### Core Structure
- `src/core/brain.js`: reasoning loop
- `src/orchestrator.js`: agent routing
- `src/services/llm.js`: LLM proxy
- `src/routes/`: API endpoints

### Data Flow
- `log.md`: shared coordination log
- `data/stream.json`: live stream
- `vector_store.db`: local memory fallback

## Development Conventions
### Coordination
- Log significant actions to `log.md`.
- Use `notes/codex-gemini.md` for Codex <-> Gemini handoffs.
- Keep changes scoped and reversible; run `npm test` after API changes.
- Avoid committing secrets; keep `.env` local only.

### Environment Configuration
- Copy `.env.example` to `.env` and fill in required values.
- `LLM_PROVIDER` enables `/llm/*` routes (openai, azure, grok).
- For local dev, set `DISABLE_AUTH=1` to bypass auth on localhost.

## Grok Integration (xAI)
- Set `GROK_API_KEY` in `.env`.
- Set `LLM_PROVIDER=grok` in `.env`.
- Restart the server after env changes.

### Direct xAI API smoke test (PowerShell)
```powershell
curl.exe https://api.x.ai/v1/chat/completions `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $env:GROK_API_KEY" `
  -d '{
    "messages": [
      { "role": "system", "content": "You are a test assistant." },
      { "role": "user", "content": "Testing. Just say hi and hello world and nothing else." }
    ],
    "model": "grok-4-latest",
    "stream": false,
    "temperature": 0
  }'
```

### Local LLM proxy test
```powershell
curl.exe http://localhost:8080/llm/chat `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <supabase_user_token>" `
  -d '{
    "messages": [
      { "role": "user", "content": "Say hi and hello world." }
    ],
    "model": "grok-4-latest"
  }'
```

## Runbooks
- Smoke test: `npm test`
- DB health: `npm run health:db`
- Memory sync: `npm run sync:two-way`
- Orchestrator watch: `npm run orchestrate:watch`

## Troubleshooting
- `llm not configured`: set `LLM_PROVIDER` and provider key in `.env`.
- `Missing API Key for provider`: verify `GROK_API_KEY` or other provider keys.
- `invalid token`: supply a Supabase user token or set `DISABLE_AUTH=1` for localhost.
- PowerShell curl alias issues: use `curl.exe` or `Invoke-RestMethod`.

## Key Paths
- `index.js`
- `src/core/brain.js`
- `src/orchestrator.js`
- `src/services/llm.js`
- `src/routes/llm.js`
- `log.md`
- `.env` and `.env.example`
- `notes/codex-gemini-feed.md`

## References
- `EIDOLON.md`
- `GEMINI.md`
- `CLAUDE.md`
- `PROJECT_VIBRANIUM.md`
