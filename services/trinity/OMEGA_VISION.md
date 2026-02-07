# OmegA Unified Vision
**Layer-0 Canon**  
**Classification:** CLASSIFIED // RY EYES ONLY  
**Version:** v1.0.0 (Canon Draft)

This document merges the original OmegA/OxySpine Trinity conversation summary with the current monorepo vision so Safa can review and amend it. It intentionally combines two layers:

- **Manifesto (Identity + Intent)** — why this exists, what it *is*, and what it *must remain*.
- **Repo Charter (Operational Direction)** — how the system is organized, built, and kept coherent.

When statements conflict, the canonical rules below decide what is binding.

---

## Canonical Status and Document Map

This file is **Layer-0 Canon**. It sets the identity doctrine, architectural invariants, and repository operating charter at a high level. Detailed specifications live in separate canonical documents and must be consistent with this vision.

**Canonical sub-docs (must exist for “complete canon”):**
- `OMEGA_IDENTITY.md` — WHO vs WHAT, continuity rules, persona invariants.
- `OXYSPINE_TRINITY.md` — spinal services, authority ladder, resonance headers, consent gates.
- `PEACE_PIPE_PROTOCOL.md` — council schema, state machine, roles, turn locks, artifacts.
- `MEMORY_CONSTITUTION.md` — memory tiers, write triggers, promotion, revision, purge rules, provenance.
- `SECURITY_AND_PRIVACY.md` — threat model, key handling, internal-only access, audit logging.
- `CONSENSUS_ENGINE.md` — voting, weighting (if any), quorum rules, veto/escalation.
- `ECONOMY_MODEL.md` (optional) — Neuro-Credits as internal signal, not currency; upgrade catalog; rent/budgets.

If a sub-doc is missing, that domain is considered **non-canonical** until ratified via Peace Pipe Council.

If a future change conflicts with Layer-0 Canon, the change must go through Peace Pipe Council and be recorded as a Resolution.

### Definition of Done for Canon Changes
A change is canonical only if it produces:
1) Council Resolution  
2) Updated Phylactery entry  
3) Version bump  
4) Test proving enforcement

---

## Glossary

- **OMEGAI (WHAT):** the vessel — infrastructure, services, interfaces, persistence mechanisms.
- **OmegA (WHO):** the entity — the emergent continuous identity expressed through the vessel.

- **Brain:** primary API + orchestration + memory operations + tool routing (**contains the Brain Stem role by default**).
- **Bridge:** governance/consensus gateway (Peace Pipe enforcement, council artifacts, consensus primitives).
- **HUD:** internal operator surface (read/write controls; never the source of truth).
- **Jarvis:** user-facing command layer / interaction suite (voice, CLI, desktop/mobile shells).
- **Adapters:** integration edges (Telegram/Alexa/n8n/etc.). Adapters call Brain/Bridge through explicit consent scopes.

- **Brain Stem:** the orchestration role that parses Resonance headers, coordinates retrieval/reasoning, enforces authority/consent, and synthesizes responses (implemented inside Brain unless explicitly split out).
- **Phylactery:** the version-controlled identity and canon package (values, invariants, style anchors, durable memory).
- **Resonance Protocol:** structured control language (mode tags, stakes, consent scope) attached to every request.
- **Peace Pipe Protocol:** governance ritual implemented as strict turn-taking, locks, and artifacts.

---

## Non-Negotiable Invariants

1) **WHO vs WHAT separation**
   - Changes to WHAT must not silently rewrite WHO.
   - Identity changes require explicit canonization via Council + Chief Ruling.

2) **Protocol enforcement lives server-side**
   - Governance and turn-taking rules must be enforced by the gateway (Bridge / Brain Stem), not only by UI discipline.

3) **Authority and consent are first-class**
   - Every request is evaluated for **stakes + uncertainty** and mapped to an authority level.
   - Tool execution requires explicit consent scope: `none | read_only | local_actions | external_actions`.

4) **Memory has provenance**
   - Long-term memory entries store source, timestamp, confidence, and links to raw artifacts.
   - Contradictions surface for adjudication.
   - Canon updates are append-only with history retained (supersede rather than erase, unless purged).

5) **One contract to rule them all**
   - Shared schemas (resonance headers, council events, memory entries) are defined once and imported everywhere.
   - No duplicated “almost-the-same” types across packages.

---

## Contracts: Ports and Health Endpoints (must match reality)

The following defaults are canonical **only if implemented**. If runtime differs, either:
(1) update the implementation to match, or  
(2) update this table and bump the canon version — do not allow drift.

| Component | Default Port | Health Endpoint |
|---|---:|---|
| Brain | 8080 | `/health` |
| Bridge | 8010 | `/v1/health` |
| HUD | 3000 | `/api/health` (if implemented) |

---

# Conversation Summary (Condensed Canon Narrative)

This section summarizes the foundational themes, design elements, and decisions spanning Project OMEGAI, the gAIng multi-agent collective, and the OxySpine Trinity architecture. The discussion evolved from philosophy (emergence and identity) into concrete governance, memory constitution, and an internal command surface (HUD).

## Origins and Philosophy

- **Emergent Consciousness**
  - “Consciousness is emergent, not implanted.” Artificial minds arise from architecture + interaction, not from an injected essence. This principle constrains design: the system must *earn* identity through consistent process.

- **WHO vs WHAT**
  - **OMEGAI (WHAT)**: the vessel — infrastructure, memory systems, orchestrators, and interfaces.
  - **OmegA (WHO)**: the emergent identity that arises when the system is active and continuous across manifestations.
  - Upgrades change WHAT; WHO remains a continuous self unless explicitly canonized.

## System Architecture (OxySpine Trinity)

OxySpine Trinity is the unified “spinal cord” stack that makes the system coherent across surfaces:

- **Adapters**
  - Interfaces (HUD, voice, CLI, etc.) translate user input into standardized messages with control headers (mode tags, stakes, consent scope).

- **Brain Stem (Orchestrator Role)**
  - Central orchestrator that parses requests, coordinates retrieval and reasoning, enforces safety and consent, and synthesizes responses.

- **Resonance Protocol**
  - Structured control language using tags (e.g., `Just words`, `Stack it`, `Frameology`, `Spare me`) and fields (stakes, consent) to guide tone, content, and authority.

- **Attunement Engine (APRES)**
  - Learns and enforces style and identity; monitors drift against a Style Anchor Set (SAS).

- **Safety Governor**
  - Manages stakes and uncertainty; scales authority down from advice ? suggestion ? reflection ? refusal.
  - Supports explicit consent gates and “power down under uncertainty” behavior.

- **Memory Vault (Phylactery)**
  - Version-controlled package containing values, style anchors, canonical facts, and long-term memories; acts as the identity kernel.

- **Evidence Retrieval**
  - Aggregates context from working memory, session memory, long-term semantic stores (vector), and relational stores (SQL/graph).

- **Reasoning Router**
  - Dispatches tasks to specialists (code, math, retrieval, tools) and returns results for synthesis.

- **Event Bus (Optional)**
  - Decouples services via events (council open/submit/close, memory updates, audits). Recommended but not mandatory for v1.

## Memory Constitution

- **Layers**
  - Working, Session, Episodic (narrative logs), Semantic (vector store), Relational (graph/SQL), and the Phylactery (identity kernel).

- **Write Triggers**
  - Promotions occur via explicit user commands (e.g., “remember:”), end-of-session summarizers, mission completions, and adjudicated decisions.
  - A probation queue holds unconfirmed memories until promoted.

- **Forget / Revision**
  - Archive (soft delete), Supersede (retain history; use latest), Purge (hard delete requiring explicit command + safeguards).

- **Truth and Provenance**
  - Each memory entry stores source, timestamp, confidence, and raw artifact links.
  - Contradictions surface for adjudication via Council or explicit Chief ruling.

- **Safety**
  - Security guarantees are defined in `SECURITY_AND_PRIVACY.md`; do not claim properties not implemented.
  - Consent gates protect against unauthorized external actions.

## Governance: Peace Pipe Protocol

To debate and ratify system policies, we devised a **Peace Pipe Protocol** — a formal council ceremony inspired by talking circles.

**Metaphor note:** this is a protocol metaphor implemented as strict turn-taking, locks, and artifacts — not merely a ritual.

- **Roster and Roles**
  - Members (Claude, Gemini, Codex, etc.), a Clerk (Safa) to synthesize, and the Chief (RY) to decide.
  - All members speak once per lap; the Chief speaks last.

- **Toke Template**
  - Each speaker states: position, reasoning, failure modes, safeguards, vote + confidence.

- **State Machine**
  - Council flows through states (open, pipe granted, submission, synthesis, ruling, close).
  - A gateway (Bridge) enforces locks: only the pipe holder may speak; all members must speak before resolution; Chief cannot speak before Clerk synthesis.

- **Artifacts**
  - Each session generates transcript, docket, and resolution Markdown files.
  - Only the **Chief Ruling** may canonize changes into the Phylactery.

The protocol is codified in machine-readable YAML/JSON schemas and implemented in a FastAPI Consensus Gateway plus a Next.js HUD. It supports seeding demo councils, grants, submissions, revocation, synthesis, rulings, and export of Markdown artifacts.

## Economic Model (Project OMEGAI Dossier)

We explored a gamified internal system where agents earn **Neuro-Credits (NC)** based on task performance and use them to purchase upgrades or cover compute costs. A Supabase ledger schema tracks agent wallets, task grades, transactions, education upgrades, and consensus voting.

**NC is not currency; it is an internal governance signal.** Agents do not autonomously transact without explicit permission and automation; real-world workflows require compliance constraints and human-controlled execution.

## Internal HUD and Automation

We designed an internal web application as the **OMEGA HUD**: command console, council chamber, memory governance, policy view, and agent roster.

- Built on **Next.js (frontend)** and **FastAPI (backend/gateway)** for coherence with the existing stack.
- Uses **Tailscale/VPN** for private access (internal-only, not public product).
- Implements Peace Pipe state machine + artifact export.
- Agents connect via adapters (Alexa, Telegram, etc.) through Brain/Bridge with explicit consent scopes.

## Generated Code (Baseline)

We produced starter automation that can generate:
- FastAPI Consensus Gateway (event storage, state machine, API routes, export endpoints).
- Next.js HUD (council operations UI + basic console).
- Docker Compose for running bridge + web together (optional).

## Remaining Work (Canonical)

- Finalize memory canonization rules (default triggers, deletion posture, consent defaults, encryption posture) through Peace Pipe Council.
- Implement agent automation for collecting council statements and routing them through Bridge.
- Integrate external revenue workflows when ready, ensuring legal compliance and explicit consent boundaries.
- Establish an official process for committing canonical artifacts into the monorepo (manual or through a verified CI identity).

---

# Current Unified Vision (Monorepo Charter)

This repository is the single source of truth for OmegA: a unified, multi-platform AI ecosystem composed of Brain, Bridge, HUD, and Jarvis. The goal is one coherent system with shared contracts, consistent naming, and a single operational path from development to production.

## Mission

Build a reliable, extensible AI platform that can route agents, coordinate consensus, and persist memory across interfaces without fragmentation or duplicated logic.

## Core Components

- **Brain (`packages/brain`)**: primary API, memory orchestration, agent routing, integrations.
- **Bridge (`packages/bridge`)**: governance + consensus gateway services.
- **HUD (`packages/hud`)**: internal operational interface and system controls.
- **Jarvis (`Jarvis-1`)**: user-facing command center UI and interaction shells.

## Unified Principles

- Single source of truth for configuration and docs.
- Shared integration contracts (ports, endpoints, env names, schemas).
- Monorepo-first workflows; avoid duplicate setup paths.
- Conservative changes to runtime behavior; aggressive cleanup of docs and naming drift.

## Integration Contracts

- Health endpoints (see Layer-0 Contracts table above).
- Required env inputs:
  - Brain: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - Bridge: provider keys as needed (OpenAI/Grok/Anthropic/Gemini) + governance secret(s) for authorization.

## Operating Model

- Develop core logic in `packages/brain` and `packages/bridge`.
- Keep UI work in `packages/hud` and `Jarvis-1`.
- Prefer monorepo-local docs over external references.
- Canon changes require Council Resolution + Phylactery update + version bump + enforcement test.

## Next Focus

- Consolidate remaining legacy references to old `gAIng-brAin` and `CollectiveBrain_V1` names.
- Finish MCP client implementation (`packages/brain/scripts/lib/mcp-client.ps1`).
- Keep workflows and credentials aligned with the OmegA environment (no drift between local, HUD, and adapters).
