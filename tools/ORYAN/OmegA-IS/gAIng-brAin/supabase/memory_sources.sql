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
