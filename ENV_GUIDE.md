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

## How to generate a Bearer Token
You can generate a random string for `OMEGA_API_BEARER_TOKEN` using:
```bash
openssl rand -hex 32
```

## Setup
1. Copy `.env.example` to `.env`.
2. Fill in the required secrets.
3. Run `docker-compose up -d`.
