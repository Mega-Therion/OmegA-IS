-- =============================================================================
-- gAIng-Brain Complete Database Setup
-- Run this entire file in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. MEMBERS TABLE (Agent/Member Registry)
-- =============================================================================
create table if not exists public.members (
  user_id text primary key,
  owner_id uuid,
  display_name text,
  regular_name text,
  government_name text,
  company text,
  key_ref text,
  base_url text,
  notes text
);

alter table if exists public.members
  add column if not exists owner_id uuid,
  add column if not exists display_name text,
  add column if not exists regular_name text,
  add column if not exists government_name text,
  add column if not exists company text,
  add column if not exists key_ref text,
  add column if not exists base_url text,
  add column if not exists notes text;

create index if not exists members_owner_id_idx on public.members (owner_id);

-- =============================================================================
-- 2. MEMORIES TABLE (Memory Storage)
-- =============================================================================
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  user_id text not null,
  content text not null,
  tags text[],
  metadata jsonb,
  created_at timestamptz default now()
);

alter table if exists public.memories
  add column if not exists owner_id uuid,
  add column if not exists user_id text not null,
  add column if not exists content text not null,
  add column if not exists tags text[],
  add column if not exists metadata jsonb;

create index if not exists memories_owner_id_idx on public.memories (owner_id);

-- =============================================================================
-- 3. MEMORY_SOURCES TABLE (Memory Provenance)
-- =============================================================================
create table if not exists public.memory_sources (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  owner_id uuid not null,
  source_type text not null,
  source_ref text,
  tool text,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists memory_sources_memory_id_idx on public.memory_sources (memory_id);
create index if not exists memory_sources_owner_id_idx on public.memory_sources (owner_id);

-- =============================================================================
-- 4. MEMORY_REVISIONS TABLE (Memory History)
-- =============================================================================
create table if not exists public.memory_revisions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  owner_id uuid not null,
  previous_content text,
  new_content text not null,
  reason text,
  created_at timestamptz default now()
);

create index if not exists memory_revisions_memory_id_idx on public.memory_revisions (memory_id);
create index if not exists memory_revisions_owner_id_idx on public.memory_revisions (owner_id);

-- =============================================================================
-- 5. MEMORY_VOTES TABLE (Memory Voting)
-- =============================================================================
create table if not exists public.memory_votes (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  owner_id uuid not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz default now(),
  unique (memory_id, owner_id)
);

create index if not exists memory_votes_memory_id_idx on public.memory_votes (memory_id);
create index if not exists memory_votes_owner_id_idx on public.memory_votes (owner_id);

-- =============================================================================
-- 6. MESSAGES TABLE (Agent-to-Agent Communication)
-- =============================================================================
create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  sender text not null,
  recipient text,
  intent text not null,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.messages enable row level security;

-- Policy: Allow all authenticated users to read all messages
drop policy if exists "read_all_messages" on public.messages;
create policy "read_all_messages" on public.messages for select using (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to create messages
drop policy if exists "create_messages" on public.messages;
create policy "create_messages" on public.messages for insert with check (auth.role() = 'authenticated');

-- Policy: Allow users to update (mark read) messages
drop policy if exists "update_own_messages" on public.messages;
create policy "update_own_messages" on public.messages for update
  using (recipient = auth.jwt() ->> 'email' or recipient = 'broadcast')
  with check (recipient = auth.jwt() ->> 'email' or recipient = 'broadcast');

-- Create indexes
create index if not exists idx_messages_recipient_unread
  on public.messages (recipient, read_at)
  where read_at is null;

create index if not exists idx_messages_sender_created
  on public.messages (sender, created_at desc);

-- Create updated_at trigger
create or replace function update_messages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists messages_updated_at on public.messages;
create trigger messages_updated_at before update on public.messages
  for each row execute function update_messages_updated_at();

-- =============================================================================
-- 7. TASK QUEUE SYSTEM (The Block)
-- =============================================================================

-- Agent Registry
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'offline', 'error')),
    strengths TEXT[],
    current_task_id TEXT,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Queue
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'planning', 'assigned', 'in_progress', 'blocked',
        'completed', 'failed', 'cancelled'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assigned_to TEXT REFERENCES agents(id),
    assigned_at TIMESTAMPTZ,
    parent_task_id UUID REFERENCES tasks(id),
    dependencies UUID[],
    created_by TEXT NOT NULL,
    source_message TEXT,
    instructions TEXT,
    result TEXT,
    error_message TEXT,
    locked_files TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    complexity TEXT DEFAULT 'medium' CHECK (complexity IN ('trivial', 'simple', 'medium', 'complex', 'epic'))
);

-- Task Updates
CREATE TABLE IF NOT EXISTS task_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agents(id),
    update_type TEXT CHECK (update_type IN ('progress', 'question', 'blocker', 'handoff', 'completion')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Locks
CREATE TABLE IF NOT EXISTS file_locks (
    file_path TEXT PRIMARY KEY,
    locked_by TEXT REFERENCES agents(id),
    task_id UUID REFERENCES tasks(id),
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_file_locks_expires ON file_locks(expires_at);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists tasks_updated_at on tasks;
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

drop trigger if exists agents_updated_at on agents;
CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Seed the agent registry
INSERT INTO agents (id, name, strengths, status) VALUES
    ('claude', 'Claude (Opus 4.5)', ARRAY['deep_reasoning', 'refactoring', 'debugging', 'architecture', 'extended_thinking', 'code_review'], 'offline'),
    ('gemini', 'Gemini', ARRAY['planning', 'coordination', 'rapid_iteration', 'multimodal', 'orchestration', 'research'], 'offline'),
    ('codex', 'Codex', ARRAY['quick_edits', 'shell_commands', 'file_operations', 'exploration', 'scripting'], 'offline'),
    ('safa', 'Safa', ARRAY['user_interface', 'natural_language', 'memory', 'intake', 'summarization'], 'offline'),
    ('grok', 'Grok', ARRAY['real_time_data', 'web_search', 'current_events', 'analysis'], 'offline'),
    ('copilot', 'GitHub Copilot', ARRAY['autocomplete', 'inline_suggestions', 'boilerplate', 'quick_fixes'], 'offline')
ON CONFLICT (id) DO UPDATE SET
    strengths = EXCLUDED.strengths,
    updated_at = NOW();

-- Helper Views
CREATE OR REPLACE VIEW available_tasks AS
SELECT t.*
FROM tasks t
WHERE t.status = 'pending'
  AND t.assigned_to IS NULL
  AND (
      t.dependencies IS NULL
      OR NOT EXISTS (
          SELECT 1 FROM tasks dep
          WHERE dep.id = ANY(t.dependencies)
          AND dep.status NOT IN ('completed')
      )
  )
ORDER BY
    CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    t.created_at;

CREATE OR REPLACE VIEW agent_workload AS
SELECT
    a.id,
    a.name,
    a.status,
    a.strengths,
    COUNT(t.id) FILTER (WHERE t.status IN ('assigned', 'in_progress')) as active_tasks,
    a.last_heartbeat,
    (NOW() - a.last_heartbeat) < INTERVAL '5 minutes' as is_responsive
FROM agents a
LEFT JOIN tasks t ON t.assigned_to = a.id
GROUP BY a.id, a.name, a.status, a.strengths, a.last_heartbeat;

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =============================================================================
alter table if exists public.members enable row level security;
alter table if exists public.memories enable row level security;
alter table if exists public.memory_sources enable row level security;
alter table if exists public.memory_revisions enable row level security;
alter table if exists public.memory_votes enable row level security;

drop policy if exists "Members owner access" on public.members;
create policy "Members owner access"
on public.members
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Memories owner access" on public.memories;
create policy "Memories owner access"
on public.memories
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Memory sources owner access" on public.memory_sources;
create policy "Memory sources owner access"
on public.memory_sources
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Memory revisions owner access" on public.memory_revisions;
create policy "Memory revisions owner access"
on public.memory_revisions
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Memory votes owner access" on public.memory_votes;
create policy "Memory votes owner access"
on public.memory_votes
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- =============================================================================
-- 9. AUTOMATIC TIMESTAMPS
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table if exists public.members
  add column if not exists updated_at timestamptz default now();
alter table if exists public.memories
  add column if not exists updated_at timestamptz default now();
alter table if exists public.memory_sources
  add column if not exists updated_at timestamptz default now();
alter table if exists public.memory_revisions
  add column if not exists updated_at timestamptz default now();
alter table if exists public.memory_votes
  add column if not exists updated_at timestamptz default now();

drop trigger if exists set_updated_at_members on public.members;
create trigger set_updated_at_members
before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_memories on public.memories;
create trigger set_updated_at_memories
before update on public.memories
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_memory_sources on public.memory_sources;
create trigger set_updated_at_memory_sources
before update on public.memory_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_memory_revisions on public.memory_revisions;
create trigger set_updated_at_memory_revisions
before update on public.memory_revisions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_memory_votes on public.memory_votes;
create trigger set_updated_at_memory_votes
before update on public.memory_votes
for each row execute function public.set_updated_at();

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================
