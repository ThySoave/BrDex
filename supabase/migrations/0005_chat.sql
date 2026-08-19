create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (participant_a < participant_b),
  unique (participant_a, participant_b)
);

alter table public.conversations enable row level security;
create policy "participants read their conversations" on public.conversations for select
  to authenticated using (auth.uid() in (participant_a, participant_b));
create policy "participants create conversations with unblocked pairs" on public.conversations for insert
  to authenticated with check (
    auth.uid() in (participant_a, participant_b)
    and not public.users_blocked(participant_a, participant_b)
  );
grant select, insert on public.conversations to authenticated;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_at_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;
create policy "participants read messages" on public.messages for select
  to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b)
    )
  );
create policy "participants send messages to unblocked pairs" on public.messages for insert
  to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.participant_a, c.participant_b)
        and not public.users_blocked(c.participant_a, c.participant_b)
    )
  );
grant select, insert on public.messages to authenticated;

alter publication supabase_realtime add table public.messages;
