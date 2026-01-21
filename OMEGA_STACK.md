# Omega Trinity Stack

This repo now boots the three Omega components together.

## Services & Ports
- Gateway (public ingress): http://localhost:8787 (map to https://omega.example.com/api/v1/*)
- Jarvis (HUD + admin): http://localhost:3001
- Portal (legacy) optional: http://localhost:3100 (set `RUN_PORTAL=1` only if needed)
- Bridge API (CollectiveBrain): http://localhost:8000 (internal-only)
- gAIng-brAin: http://localhost:8080 (internal-only)
- Frontend consolidation: Jarvis is the canonical UI; portal/chat_history_viewer is deprecated.

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
- `pnpm dev` for the portal (optional; port 3100, override with `PORT`, enable with `RUN_PORTAL=1`)
- `npm run dev` in `Jarvis` (port 3001, override with `JARVIS_PORT`)
- `uvicorn api:app` in `bridge` (port 8000, override with `COLLECTIVE_PORT`, binds internal by default)
- `npm start` in `gAIng-brAin` (port 8080, override with `GAING_PORT`, binds internal by default)
- `uvicorn app.main:app` in `gateway` (port 8787, override with `GATEWAY_PORT`) as the single public ingress

Services are skipped if key files are missing. gAIng-brAin is skipped unless both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.

## Required Env
- Configure all env in the root `.env` (see `.env.example` for the full list).
- Gateway/Events: `OMEGA_DB_URL` should point to your Supabase Postgres (persistence over local).
- gAIng-brAin: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (if used), optional `MEM0_API_KEY`, `ENABLE_NGROK`, `NGROK_AUTHTOKEN`, `LLM_PROVIDER` + provider keys.
- Bridge (CollectiveBrain): at least one LLM credential (`GITHUB_TOKEN` or `OPENAI_API_KEY` or Azure equivalents).
- Gateway: `OMEGA_BRAIN_BASE_URL`, `OMEGA_OPENAI_API_KEY`, `OMEGA_MODEL`, `GATEWAY_PORT`, optional bearer token, `OMEGA_INTERNAL_TOKEN`.
- Portal/Jarvis: set any OAuth/API keys you already use; adjust `PORT`, `JARVIS_PORT`, `COLLECTIVE_PORT`, `GAING_PORT`, `GATEWAY_PORT` if needed.

## Notes
- Stop everything with `Ctrl+C`; the launcher will send SIGTERM to child processes.
- If you only need a subset, export the required env then run the individual commands inside each folder.
- Use `docker-compose.yml` for parity: gateway is the only exposed port; brain/bridge bind to internal network. Provide `OMEGA_INTERNAL_TOKEN` to secure internal calls.
- Use `pnpm omega:smoke` to verify health/status and idempotent memory upsert via gateway.
