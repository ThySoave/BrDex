create table public.trades (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  proposed_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.trades enable row level security;

create policy "participants read trades" on public.trades for select
  to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b)
    )
  );

create policy "participants propose trades in their conversations" on public.trades for insert
  to authenticated with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b)
    )
  );

grant select, insert on public.trades to authenticated;

create index trades_conversation_created_at_idx on public.trades (conversation_id, created_at);

-- Confirmação só pelo outro participante (RLS não restringe colunas em update,
-- então a confirmação vai por função security definer).
create function public.confirm_trade(trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  trade record;
begin
  select t.proposed_by, t.confirmed_at, c.participant_a, c.participant_b
    into trade
    from public.trades t
    join public.conversations c on c.id = t.conversation_id
   where t.id = trade_id;

  if not found then
    raise exception 'troca não encontrada';
  end if;

  if trade.confirmed_at is not null then
    raise exception 'troca já confirmada';
  end if;

  if auth.uid() = trade.proposed_by then
    raise exception 'quem propôs não pode confirmar a troca';
  end if;

  if auth.uid() is null or auth.uid() not in (trade.participant_a, trade.participant_b) then
    raise exception 'apenas participantes da conversa podem confirmar';
  end if;

  update public.trades set confirmed_at = now() where id = trade_id;
end;
$$;

-- Reputação pública: contagem de trocas confirmadas do usuário.
create function public.completed_trades_count(target_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.trades t
    join public.conversations c on c.id = t.conversation_id
   where t.confirmed_at is not null
     and target_user in (c.participant_a, c.participant_b);
$$;

revoke all on function public.confirm_trade(uuid) from public;
revoke all on function public.completed_trades_count(uuid) from public;
grant execute on function public.confirm_trade(uuid) to authenticated;
grant execute on function public.completed_trades_count(uuid) to authenticated;
