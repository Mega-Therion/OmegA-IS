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
