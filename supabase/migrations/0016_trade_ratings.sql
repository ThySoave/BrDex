-- Fase 13 — Avaliação pós-negociação: nota 1–5 + comentário opcional por troca confirmada.

create table public.trade_ratings (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  rater uuid not null references auth.users(id) on delete cascade,
  rated_user uuid not null references auth.users(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (trade_id, rater)
);

alter table public.trade_ratings enable row level security;

-- Avaliador e avaliado leem a avaliação; a média pública sai por função, não pela tabela.
create policy "rater and rated read ratings" on public.trade_ratings for select
  to authenticated using (auth.uid() in (rater, rated_user));

grant select on public.trade_ratings to authenticated;

create index trade_ratings_rated_user_idx on public.trade_ratings (rated_user);

-- Escrita só pela função: as regras (trade confirmada, participante, avaliado derivado,
-- uma avaliação por avaliador) vão por security definer, mesmo padrão de confirm_trade.
create function public.rate_trade(trade_id uuid, stars int, comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  trade record;
  target uuid;
begin
  if stars < 1 or stars > 5 then
    raise exception 'nota deve ser entre 1 e 5';
  end if;

  select t.confirmed_at, c.participant_a, c.participant_b
    into trade
    from public.trades t
    join public.conversations c on c.id = t.conversation_id
   where t.id = rate_trade.trade_id;

  if not found then
    raise exception 'troca não encontrada';
  end if;

  if auth.uid() is null or auth.uid() not in (trade.participant_a, trade.participant_b) then
    raise exception 'apenas participantes da conversa podem avaliar';
  end if;

  if trade.confirmed_at is null then
    raise exception 'só trocas confirmadas podem ser avaliadas';
  end if;

  if exists (
    select 1 from public.trade_ratings r
     where r.trade_id = rate_trade.trade_id and r.rater = auth.uid()
  ) then
    raise exception 'troca já avaliada por você';
  end if;

  target := case when auth.uid() = trade.participant_a
                 then trade.participant_b
                 else trade.participant_a end;

  insert into public.trade_ratings (trade_id, rater, rated_user, stars, comment)
  values (rate_trade.trade_id, auth.uid(), target, rate_trade.stars, rate_trade.comment);
end;
$$;

-- Média pública de avaliações do usuário, mesmo padrão de completed_trades_count.
create function public.user_rating_summary(target_user uuid)
returns table(avg_stars numeric, ratings_count int)
language sql
stable
security definer
set search_path = public
as $$
  select round(avg(stars)::numeric, 1), count(*)::int
    from public.trade_ratings
   where rated_user = target_user;
$$;

revoke all on function public.rate_trade(uuid, int, text) from public;
revoke all on function public.user_rating_summary(uuid) from public;
grant execute on function public.rate_trade(uuid, int, text) to authenticated;
grant execute on function public.user_rating_summary(uuid) to authenticated;
