# n8n Workflows for OMEGA

This folder contains pre‑configured workflows designed to run on [n8n](https://n8n.io/). These flows implement the daily governance and continuity loops that make up the **Peace Pipe Protocol** and the **gAIng Income Engine** described in the OMEGA system design.

## Peace Pipe Ceremony

Located at `Peace_Pipe_Ceremony_OMEGA_n8n.json`, this workflow runs once per day (or on manual trigger) and performs the following high‑level steps:

1. **Enumerate active agents** from your Supabase `members` table.
2. **Retrieve recent memories** for each agent and generate a structured status report using your LLM.
3. **Aggregate reports** and produce a strategic synthesis across the entire crew.
4. **Log API costs** into the `financial_ledger` table for transparency.
5. **Include your director note**, if present, from the past 24 hours (agent name =`RY`).
6. **Deliver a Markdown report** to Telegram (the Peace Pipe) summarizing agent statuses, synthesis, costs and your note.
7. **Optionally trigger the Income Engine** by sending an HTTP call when the ceremony is complete (see the `trigger_income_engine` node; you can pause this by including `#pause_income` in your note).

Import this JSON into your n8n instance via *Workflow → Import from File* and configure the following nodes:

- Update the Supabase credentials for the `Get Active Agents` and `Get Agent Memories` nodes.
- Provide your OpenAI (or other provider) API credentials for the AI nodes.
- Set your Telegram bot token and chat ID in the `Send Peace Pipe Report` node.
- Edit the trigger in `trigger_income_engine` to point at the Income Engine webhook URL (see below).

## gAIng Income Engine

Located at `gAIng_Income_Engine_OMEGA_n8n.json`, this workflow is triggered by the Peace Pipe ceremony when it's time to assign “day jobs” to your agents. It performs the following steps:

1. **Retrieve all active agents** from Supabase.
2. **Generate a crew roundtable conversation** via your LLM where each agent proposes income‑generating tasks for the others, offers feedback, and converges on assignments.
3. **Persist job assignments** into a new `agent_jobs` table (see schema in `OMEGA_Workflows_README.md`).
4. **Send a summary** of the assigned jobs to your Telegram channel for visibility.

To use this workflow:

- Import the JSON file and set your Supabase credentials on the relevant nodes.
- Ensure the `agent_jobs` table exists (see the `OMEGA_Workflows_README.md` for an example schema).
- Provide your LLM API credentials for the crew roundtable node.
- Update the webhook trigger node in the Peace Pipe ceremony to call this workflow’s webhook URL.

## Additional resources

- `OMEGA_Workflows_README.md` — a detailed guide on how the two workflows integrate, including a suggested schema for the `agent_jobs` table and tips for customizing the flows.

These workflows are intended to serve as a starting point. Feel free to modify them to suit your specific gAIng setup and governance needs.

### Integration note: Income Engine → Brain ledger
- After importing, add a final HTTP Request node that POSTs to `http://brain:8080/day-jobs/complete` (or the gateway URL `/api/day-jobs/complete`) when a task is finished. This keeps `revenue-ledger.json` in gAIng-brAin up to date with n8n outputs.
