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
