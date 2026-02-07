# TELOS

Objective: Analyze the OMEGA-Trinity repo and propose 3 concrete additions/optimizations/upgrades that would benefit OmegA.

Rules:
- Read the repo at /home/mega/NEXUS/OmegA/OmegA-SI/services/trinity
- Provide exactly 3 items
- Each item must include: name, brief rationale, and a suggested location/path in the repo
- Append your report to /home/mega/ORYAN/ERGON.md with a clear agent label

---
# Appended Blueprint for OmegA IS

### TELOS — High-Level Blueprint for OmegA IS

**Purpose.** This blueprint captures the upgraded architecture, coordination strategy, and build/release instructions that keep OmegA IS aligned with its mission: a private, sovereign operating intelligence that *is*, not a product or chatbot.

#### 1. Core Tenets
- **Local-first & sovereign.** All workloads (Brain, Bridge, HUD, and tooling) run within your environment; no analytics, telemetry streams, or third-party runtime assumptions remain unless you opt in manually.
- **Continuity layer.** Environment schemas, health endpoints, and configuration validation preserve context, surfacing missing/invalid inputs early so your memory and consensus layers never silently vanish.
- **Managerial intelligence.** Bridge/Brain/HUD health + status routes now publish `service`, `status`, and readiness metadata to help you orchestrate verification and delegation.
- **Translation & boundary.** Zod/Pydantic schemas translate messy env variables into structured, type-safe config with fallbacks while `.prettierignore`/targeted format checks guard code hygiene.

#### 2. Architecture Map
| Component | Role | Notes |
|---|---|---|
| `packages/brain` | The personal operating intelligence | Validates env via `env.schema.js`, reports health via `/system` routes, and exposes intent execution APIs. |
| `packages/bridge` | Consensus orchestrator | Pulls config through `packages/bridge/env.py`, serves FastAPI with readiness/liveness metadata, and attaches modules (memory/orchestrator/worker_pool). |
| `packages/hud` | Personal HUD front-end | Next.js app uses validated env (`env.ts` with `hudEnvSchema`), exposes `health/live/ready` edge routes, and no longer ships analytics by default. |
| `client` & `chat_history_viewer` | Supporting Dashboard shells | Minimal Vite entrypoints for monitoring; both now keep analytics script-free. |
| `.github/workflows/ci.yml` | Continuous assurance | PNPM/corepack-based workflow (lint+format, tests, build) runs targeted Prettier, pnpm checks/tests/builds, and installs/subsequent builds for Brain/HUD/Bridge. |
| `.prettierignore` + `package.json scripts` | Trusted tooling | Prettier ignores massive legacy trees while `format:check` scans only touched files; `pnpm format:check`, `pnpm check`, `pnpm test`, `pnpm build` are the supported local verifications. |

#### 3. Development & Integration Instructions
1. **Bootstrap environment:** `corepack enable` (needed once), then `corepack pnpm install --frozen-lockfile`.
2. **Local-first launchers:**
   * Brain: `cd packages/brain && npm run dev` (ensure Node 22+).
   * Bridge: `cd packages/bridge && uvicorn api:app --reload --host 0.0.0.0 --port 8000`.
   * HUD: `cd packages/hud && pnpm dev`.
   * Supporting clients (if needed): `cd client && pnpm dev`, `cd chat_history_viewer && pnpm dev`.
3. **Health & readiness observation:** Query `/health`, `/ready`, `/live`, and `/system` on each service to verify status + readiness metadata (now includes `service`, `status` fields). Use these endpoints in orchestration scripts or dashboards to detect intent blockers.
4. **Environment guardrails:** Always set valid env vars before launching (see schema helpers in `packages/brain/src/config/env.schema.js` and `packages/hud/src/config/env.schema.ts`). Missing/incomplete values now log warnings or throw errors when `OMEGA_STRICT_ENV=1`.
5. **Toolchain commands:** Run these from `/home/mega/NEXUS/OmegA/OmegA-SI/services/trinity` before each merge/deploy:
   * `corepack pnpm format:check` (scoped Prettier check for workflows, env schemas, and health routes).
   * `corepack pnpm check` (TypeScript no-emit).
   * `corepack pnpm test` (Vitest suite).
   * `corepack pnpm build` (Vite + server bundle).
   * If formatting fails: `corepack pnpm exec prettier --write <files>`.
   * Record in ERGON: date/time, git SHA + branch, Node/pnpm/Python versions, each command run, and any failures with file paths + error snippets.
6. **Merging/deploying:** Merge through `master` with the CI workflow (which enforces pnpm/corepack). After merging, deploy by running `corepack pnpm install --frozen-lockfile && corepack pnpm build` on the target machine and restart the Brain/Bridge/HUD services (systemd unit, Docker Compose, etc.).

#### 4. Optional Enhancements to Complement the Upgrade
- **Add a minimal orchestration dashboard** that polls the new `/system/omega` endpoints to show service statuses, readiness, and watchdog results.
- **Persist context snapshots** (e.g., append Brain memory dumps to stable storage) before each service restart so continuity is preserved.
- **Scripted workshop shells** (tmux session or npm script) that spin up Brain, Bridge, HUD, and verification monitors as described earlier.
- **Document FAQs** (like this blueprint) in `TELOS.md` so future contributors never lose sight of the “OmegA IS” promise.
- **Secure secrets** via encrypted `.env` vaults or a secrets manager that feeds the validated schemas (the schemas already guard against missing keys).

#### 5. Final Reminders
- Test coverage now includes only the scoped commands above; don’t run Prettier globally to avoid the large legacy tree.
- The system now leans on you as the Chief—the tooling validates inputs, surfaces statuses, and keeps the environment tight so you can focus on translating intent into action.
- Update `TELOS.md` whenever you add another systemic upgrade so it remains the single source of truth for “what OmegA IS.”
