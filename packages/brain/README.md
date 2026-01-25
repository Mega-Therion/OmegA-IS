# gAIng Brain

A collective memory database for AI friends. This project provides a simple API to manage AI "members" and their shared "memories" using Supabase as a backend and ngrok for public access.

## Setup

0.  **Node Version**: Use Node 22+ (see `.nvmrc`).
    ```bash
    nvm use
    ```

1.  **Environment Variables**: Create a `.env` file in the root directory with the following variables (loaded automatically on startup):
    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Server-side key (recommended so RLS does not block requests).
    *   `SUPABASE_ANON_KEY`: Optional fallback if you do not want to use service role (will require RLS policies to allow anon).
    *   `MEM0_API_KEY`: Your Mem0 API key (required for `/addMemory` and `/searchMemory`). If unset, those endpoints return 503.
    *   `NGROK_AUTHTOKEN`: Your ngrok authtoken (if `ENABLE_NGROK` is true).
    *   `ENABLE_NGROK`: Set to `1` to enable ngrok tunneling, or `0` to disable.
    *   `GAING_SHARED_TOKEN`: Deprecated. Use Supabase Auth bearer tokens instead.
    *   `LLM_PROVIDER`: Optional. Set to `openai`, `azure`, or `grok` to enable `/llm/*` endpoints.
    *   `OPENAI_API_KEY`: Required if `LLM_PROVIDER=openai`.
    *   `OPENAI_BASE_URL`: Optional override for OpenAI base URL (default `https://api.openai.com/v1`).
    *   `OPENAI_MODEL`: Optional default model for OpenAI (default `gpt-4o-mini`).
    *   `GROK_API_KEY`: Required if `LLM_PROVIDER=grok`.
    *   `AZURE_OPENAI_API_KEY`: Required if `LLM_PROVIDER=azure`.
    *   `AZURE_OPENAI_ENDPOINT`: Required if `LLM_PROVIDER=azure` (e.g., `https://<resource>.openai.azure.com`).
    *   `AZURE_OPENAI_DEPLOYMENT`: Required if `LLM_PROVIDER=azure` (your deployment name).
    *   `AZURE_OPENAI_API_VERSION`: Optional API version (default `2024-06-01`).
    *   `GEMINI_API_KEY`: Required for realtime Gemini multimodal support.
    *   `CODE_INTERPRETER_SANDBOX`: `local` or `e2b` (optional).
    *   `E2B_API_KEY`: Required if `CODE_INTERPRETER_SANDBOX=e2b`.
    *   `AGENTIC_ALLOWED_ROOTS`: Comma-separated roots for code tools.
    *   `AGENTIC_ROOT`: Default root for code tools.

2.  **Supabase Database Setup**:
    *   Set up your Supabase project.
    *   Run the SQL files in the `supabase/` directory to create the necessary tables and RLS policies.
        *   `supabase/members.sql`
        *   `supabase/memories.sql`
        *   `supabase/memory_sources.sql`
        *   `supabase/memory_revisions.sql`
        *   `supabase/memory_votes.sql`
        *   `supabase/rls.sql` (Contains row-level security policies)

3.  **Supabase Auth**:
    *   Create users via Supabase Auth (email/password or magic link).
    *   Clients must include `Authorization: Bearer <access_token>` for all API calls.
    *   Rows are scoped to the authenticated user via `owner_id`.

## Installation

1.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Application

1.  Start the Express server:
    ```bash
    npm start
    ```

## Verify Supabase

1.  Run a quick DB health check:
    ```bash
    npm run health:db
    ```

## Smoke Test

1.  Start the Express server (in another terminal):
    ```bash
    npm start
    ```

2.  Run the smoke test (checks `/` and that `/memories` is protected):
    ```bash
    npm test
    ```
    *   Optional: `BASE_URL=http://localhost:8080`

## API Endpoints

All endpoints require a Supabase Auth bearer token:
`Authorization: Bearer <access_token>`

*   **`GET /health`**
    *   Health check.
    *   Returns `{ ok: true, message: 'gAIng brain online' }`.

*   **`POST /memories`**
    *   Create a memory in Supabase.
    *   **Body**: `{ content: "string", tags: ["string"], metadata: { "key": "value" }, source: { "source_type": "string", "source_ref": "string", "tool": "string", "confidence": 0.8, "metadata": {} } }`
    *   Returns `{ ok: true, memory: { ... }, source: { ... } }`.

*   **`GET /memories?limit=50`**
    *   List your memories (scoped to your auth user).
    *   Returns `{ ok: true, memories: [ ... ] }`.

*   **`GET /memories/search?q=term&limit=25`**
    *   Search your memories by content.
    *   Returns `{ ok: true, memories: [ ... ] }`.

*   **`PATCH /memories/:id`**
    *   Update a memory and record a revision.
    *   **Body**: `{ content?: "string", tags?: ["string"], metadata?: { "key": "value" }, reason?: "string" }`
    *   Returns `{ ok: true, memory: { ... } }`.

*   **`POST /memories/:id/vote`**
    *   Upsert a vote on a memory.
    *   **Body**: `{ vote: 1 | -1 }`
    *   Returns `{ ok: true, vote: { ... } }`.

*   **`POST /members`**
    *   Register or update a member.
    *   **Body**: `{ user_id: "string", display_name: "string", ...other_member_fields }`
    *   Returns `{ ok: true, member: { ... } }`.

*   **`GET /members`**
    *   List all registered members.
    *   Returns `{ ok: true, members: [ ... ] }`.

*   **`GET /members/names`**
    *   List only the names of registered members.
    *   Returns a plain text string of comma-separated names.

*   **`GET /llm/status`**
    *   Returns LLM provider readiness and missing env vars.
    *   Requires `LLM_PROVIDER` configuration.

*   **`POST /llm/chat`**
    *   Proxy chat completions to OpenAI or Azure OpenAI (BYOK).
    *   **Body**: `{ messages: [{ role: "user", content: "hi" }], model?: "string", temperature?: 0.2, max_tokens?: 200 }`
    *   Returns `{ ok: true, provider, response, raw }`.

*   **`POST /addMemory`**
    *   Add a memory for a specific user.
    *   **Body**: `{ content: "string", tags: ["string"], metadata: { "key": "value" } }`
    *   Returns `{ ok: true, memory: { ... } }`.
    *   Uses Mem0 (external) and associates memories with the authenticated user.

*   **`GET /searchMemory?q=term`**
    *   Search memories.
    *   **Query Parameters**: `q` (search term).
    *   Returns `{ ok: true, results: [ ... ] }`.

## Automation

Use these scripts to keep the local brain always-on and sync a local archive from Supabase.

- Start server on login:
  - powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\register-startup-tasks.ps1
- Optional ngrok task: 
  - powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\register-startup-tasks.ps1 -EnableNgrokTask
- Remove tasks:
  - powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\unregister-startup-tasks.ps1

Local archive export:
- powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\sync-archive.ps1

Two-way sync at login:
- register-startup-tasks.ps1 also creates the gAIngBrain-TwoWaySync task

Local two-way sync (full throttle):
- Initialize local DB:
  - npm run init:local-db
- Ensure Supabase has updated_at triggers:
  - Run supabase\\updated_at.sql in your Supabase SQL editor
- Sync both directions:
  - npm run sync:two-way
  - or: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\sync-two-way.ps1

Notes:
- The server uses Supabase as the source of truth; the archive is a local snapshot for backup/review.
- Two-way sync uses updated_at; latest timestamp wins and overwrites the other side.
- If ENABLE_NGROK=1 and NGROK_AUTHTOKEN is set, the server can start ngrok internally; the separate ngrok task is optional.
