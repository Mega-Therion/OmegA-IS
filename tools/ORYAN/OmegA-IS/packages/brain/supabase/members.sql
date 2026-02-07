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
