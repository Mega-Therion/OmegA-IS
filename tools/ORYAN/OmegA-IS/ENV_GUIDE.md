# Omega Trinity Environment Variables Guide

To run Omega Trinity in production, you need to set several environment variables. You can create a `.env` file in the root of the repository.

## Required Secrets

| Variable | Description |
|----------|-------------|
| `OMEGA_OPENAI_API_KEY` | Your OpenAI API key (or key for your chosen provider). |
| `OMEGA_API_BEARER_TOKEN` | A secret token you generate to secure your Gateway API. |
| `SUPABASE_URL` | Your Supabase project URL (if using remote DB). |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |
| `MEM0_API_KEY` | Your Mem0 API key for semantic memory. |

## Optional / Local Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_AI_MODE` | Set to `local` to use Ollama, or `remote`. | `local` |
| `OMEGA_MODEL` | The remote model to use (e.g., `gpt-4o-mini`). | `gpt-4o-mini` |
| `OMEGA_LOCAL_MODEL` | The local model to use in Ollama (e.g., `llama3`). | `llama3` |
| `POSTGRES_PASSWORD` | Secure password for the local Postgres container. | `omega_secure_password` |
| `GF_SECURITY_ADMIN_PASSWORD` | Admin password for the Grafana dashboard. | `admin` |
| `OMEGA_STRICT_ENV` | If `1`, fail fast on missing required env vars. | `0` |
| `NEXT_PUBLIC_BRAIN_API_URL` | HUD → Brain URL. | `http://localhost:8080` |
| `NEXT_PUBLIC_BRIDGE_API_URL` | HUD → Bridge URL. | `http://localhost:8000` |
| `MEMORY_CONSOLIDATION_OWNER_ID` | Owner/user id for scheduled memory consolidation. | *(unset)* |
| `MEMORY_CONSOLIDATION_DAYS` | Consolidate memories older than N days. | `30` |
| `MEMORY_CONSOLIDATION_LIMIT` | Max memories to consolidate per run. | `50` |
| `MEMORY_CONSOLIDATION_INTERVAL_MINUTES` | Consolidation interval in minutes. | `180` |
| `CONSENSUS_QUORUM_RATIO` | Quorum ratio for consensus. | `0.66` |
| `CONSENSUS_FALLBACK_MODE` | Fallback mode when quorum not met (`strict`, `degraded`). | `strict` |
| `CONSENSUS_FALLBACK_QUORUM_RATIO` | Fallback quorum ratio (degraded mode). | `0.5` |

## Environment Validation
The Brain and HUD now perform lightweight env validation at startup. In production, set
`OMEGA_STRICT_ENV=1` to enforce required variables.

## How to generate a Bearer Token
You can generate a random string for `OMEGA_API_BEARER_TOKEN` using:
```bash
openssl rand -hex 32
```

## Setup
1. Copy `.env.example` to `.env`.
2. Fill in the required secrets.
3. Run `docker-compose up -d`.
