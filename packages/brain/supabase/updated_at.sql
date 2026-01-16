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
