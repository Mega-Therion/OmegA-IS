-- Create messages table for agent-to-agent communication
-- Replaces text log.md with structured, queryable message queue

create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  sender text not null,                          -- Agent name (e.g., "Claude", "Gemini")
  recipient text,                                -- Agent name or "broadcast" for all
  intent text not null,                          -- Action intent (e.g., "instruction", "task", "report", "ack")
  data jsonb,                                    -- Structured payload
  read_at timestamptz,                           -- When recipient marked as read (null = unread)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.messages enable row level security;

-- Policy: Allow all authenticated users to read all messages
create policy "read_all_messages" on public.messages for select using (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to create messages
create policy "create_messages" on public.messages for insert with check (auth.role() = 'authenticated');

-- Policy: Allow users to update (mark read) messages they are the recipient of
create policy "update_own_messages" on public.messages for update
  using (recipient = auth.jwt() ->> 'email' or recipient = 'broadcast')
  with check (recipient = auth.jwt() ->> 'email' or recipient = 'broadcast');

-- Create index for fast queries on unread messages
create index if not exists idx_messages_recipient_unread
  on public.messages (recipient, read_at)
  where read_at is null;

-- Create index for sender queries
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
