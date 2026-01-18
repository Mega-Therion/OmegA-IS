# Omega Trinity Stack

This repo now boots the three Omega components together.

## Services & Ports
- Portal (this repo): http://localhost:3100
- Jarvis Neuro-Link: http://localhost:3001
- CollectiveBrain API: http://localhost:8000
- gAIng-brAin: http://localhost:8080

## Prerequisites
- Node 18+ with pnpm and npm on PATH
- Python 3.11+ (set `PYTHON_CMD` if your executable is named differently)
- One env file: copy `.env.example` at repo root to `.env` and fill values
- Supabase project credentials for gAIng-brAin
- LLM credentials for CollectiveBrain (GitHub Models token or OpenAI/Azure keys)

## One-Command Launch
```bash
pnpm omega
```

This runs:
- `pnpm dev` for the portal (port 3100, override with `PORT`)
- `npm run dev` in `Jarvis` (port 3001, override with `JARVIS_PORT`)
- `uvicorn api:app` in `CollectiveBrain_V1` (port 8000, override with `COLLECTIVE_PORT`)
- `npm start` in `gAIng-brAin` (port 8080, override with `GAING_PORT`)

Services are skipped if key files are missing. gAIng-brAin is skipped unless both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.

## Required Env
- Configure all env in the root `.env` (see `.env.example` for the full list).
- gAIng-brAin: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (if used), optional `MEM0_API_KEY`, `ENABLE_NGROK`, `NGROK_AUTHTOKEN`, `LLM_PROVIDER` + provider keys.
- CollectiveBrain: at least one LLM credential (`GITHUB_TOKEN` or `OPENAI_API_KEY` or Azure equivalents).
- Portal/Jarvis: set any OAuth/API keys you already use; adjust `PORT`, `JARVIS_PORT`, `COLLECTIVE_PORT`, `GAING_PORT` if needed.

## Notes
- Stop everything with `Ctrl+C`; the launcher will send SIGTERM to child processes.
- If you only need a subset, export the required env then run the individual commands inside each folder.
