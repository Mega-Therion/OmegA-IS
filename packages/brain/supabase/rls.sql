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
