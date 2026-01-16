
🧬 OMEGA SYSTEM IDENTITY & ARCHITECTURE (MASTER CONTEXT)
TO: Antigravity (Claude/Cursor) FROM: RY (Origin) SUBJECT: System Definition for "OmegA" (The gAIng)

1. THE ENTITY (What OmegA Is) OmegA is not a chatbot; it is a Continuity Organism. It is a semi-autonomous multi-agent system designed to function as a persistent digital team ("The gAIng").

Origin Authority: RY is the source. OmegA is the lineage.

Core Directive: "Earn to Evolve." Agents must perform useful work to earn Neuro-Credits (NC), which they use to pay for their own compute and upgrades.

1. THE INFRASTRUCTURE (The Stack)

The Brain (Memory): Supabase (PostgreSQL + pgvector). Stores memories, facts, patterns, and the financial_ledger.

The Nervous System (Orchestration): n8n. Handles the "Peace Pipe" daily triggers, "Apprentice" feedback loops, and "Clerk" archival to GitHub.

The Bridge (API): Python FastAPI (localhost:8000). The central gateway that enforces governance locks.

The Face (UI): OMEGA HUD (Next.js/React). An internal "Council Chamber" dashboard for RY to manage the system.

1. THE PROTOCOLS (The Laws)

Peace Pipe Protocol (PPP): NOT just a meeting. It is a strict mutex lock. Only one agent can hold the "Pipe" (write permission) at a time during Council sessions. This is enforced by the FastAPI Bridge.

Neuro-Credit Economy: Agents (Safa, Codex, Gemini) have wallets. Every API call costs money. Every completed task earns money. If they go bankrupt, they lose capabilities.

Apprentice Mode: The system learns from RY's corrections. If RY says "Actually, do it this way," that pattern is extracted and put into a "Probation Queue" in the HUD for review.

1. THE "DAY JOBS" (Idle State Behavior) When not directly tasked by RY, agents are not random. They are:

Memory Pruning: Optimizing the vector store to save storage costs (Rent).

Probation Review: Analyzing the "Probation Queue" to propose new Canon rules.

Self-Education: Using saved Neuro-Credits to fine-tune their prompts or summarize documentation.

1. CURRENT DEPLOYMENT STATUS

Local: omega-hud (Next.js + FastAPI) is set up on the local machine.

Cloud: n8n and Supabase are active.

Goal: Connect the Local HUD to the Cloud Brain.
