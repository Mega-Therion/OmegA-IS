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
