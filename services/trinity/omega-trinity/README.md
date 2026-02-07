# omega-trinity (canonical monorepo)

**Policy:** `apps/web` is the only Vercel-facing surface. Everything under `core/` assumes **Tailscale-only** network access.

## Layout
- `apps/web/` public UI + public-safe API routes
- `core/orchestrator/` plans, routing, tool-calls
- `core/gateway/` private webhook intake + normalization + queue (SQLite)
- `core/mcp-host/` MCP runtime (consent-gated)
- `core/memory/` vector store + artifacts
- `core/models/` local model profiles + prompts
- `workflows/` n8n + Zapier automation
- `infra/` tailscale + vercel + secrets
- `docs/` wiring map + schema + runbooks

## Local-first posture
- Tailscale-only for all `core/` services.
- Only `apps/web` exposes public-safe endpoints.
