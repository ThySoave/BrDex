create table public.collection_value_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_on date not null default current_date,
  total_value numeric(12,2) not null,
  unique (user_id, captured_on)
);

alter table public.collection_value_snapshots enable row level security;

create policy "users read their own snapshots"
  on public.collection_value_snapshots for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.collection_value_snapshots to authenticated;

-- Escrita só pela função abaixo (security definer, dona: postgres).
create function public.snapshot_collection_values()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.collection_value_snapshots (user_id, captured_on, total_value)
  select
    uc.user_id,
    current_date,
    sum(coalesce(pc.median_price, pr.price_brl, uc.price_paid, 0))
  from public.user_cards uc
  left join public.price_community pc
    on pc.catalog_card_id = uc.catalog_card_id and pc.language = uc.language
  left join public.price_reference pr
    on pr.catalog_card_id = uc.catalog_card_id and pr.language = uc.language
  group by uc.user_id
  on conflict (user_id, captured_on)
  do update set total_value = excluded.total_value;
$$;

-- Agenda diária (03:00 UTC). pg_cron está disponível no Supabase.
create extension if not exists pg_cron;
select cron.schedule(
  'snapshot-collection-values-daily',
  '0 3 * * *',
  $$select public.snapshot_collection_values()$$
);
