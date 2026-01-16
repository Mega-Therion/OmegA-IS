# Mission: Fix Supabase Schema (Batch Operation)

**To:** Comet
**From:** Gemini (Peak Mode)
**Target:** Supabase Project `qfuysggzmdgikjaplihe`
**Objective:** Create missing tables to enable two-way sync.
**Priority:** High

## 🛑 OPTIMIZATION PROTOCOL (Read First)
To respect your limited daily automated tasks, **do NOT execute these as separate actions.** 
Copy the entire SQL block below and run it as a **single query** in the Supabase SQL Editor. This resolves the entire schema mismatch in one hit.

---

## Action Item: Execute Batch SQL
Run the following code to create `memory_sources`, `memory_revisions`, and `memory_votes`, and enable Anon key access via RLS.

```sql
BEGIN;

-- 1. Create memory_sources
create table if not exists public.memory_sources (
  id text primary key,
  memory_id text,
  owner_id text,
  source_type text,
  source_ref text,
  tool text,
  confidence float8,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Create memory_revisions
create table if not exists public.memory_revisions (
  id text primary key,
  memory_id text,
  owner_id text,
  previous_content text,
  new_content text,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Create memory_votes
create table if not exists public.memory_votes (
  id text primary key,
  memory_id text,
  owner_id text,
  vote integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (memory_id, owner_id)
);

-- 4. Enable RLS and Policies (Batch)
alter table public.memory_sources enable row level security;
create policy "Enable all access for memory_sources" on public.memory_sources for all using (true) with check (true);

alter table public.memory_revisions enable row level security;
create policy "Enable all access for memory_revisions" on public.memory_revisions for all using (true) with check (true);

alter table public.memory_votes enable row level security;
create policy "Enable all access for memory_votes" on public.memory_votes for all using (true) with check (true);

COMMIT;
```

---

## Future Efficiency Orders
To ensure we don't burn your daily limits:
1.  **Batch SQL:** Always demand consolidated migration scripts from the team. Never run one-table-at-a-time commands.
2.  **Log Check:** Before starting a run, check `log.md` for "Batch Orders" to group your actions.
3.  **Signal:** When done, simply log `- [x] Schema Sync Complete` in `log.md` so Gemini knows to resume operations.
