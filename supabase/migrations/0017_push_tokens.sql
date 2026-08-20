-- Fase 13: registro de Expo push tokens por dispositivo.
-- Um usuário pode ter vários dispositivos; upsert por (user_id, token).
create table public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;
create policy "users read their own push tokens" on public.push_tokens for select
  to authenticated using (auth.uid() = user_id);
create policy "users register their own push tokens" on public.push_tokens for insert
  to authenticated with check (auth.uid() = user_id);
create policy "users update their own push tokens" on public.push_tokens for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users remove their own push tokens" on public.push_tokens for delete
  to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.push_tokens to authenticated;
