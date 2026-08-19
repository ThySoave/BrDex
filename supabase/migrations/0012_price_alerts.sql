create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_card_id uuid not null references public.cards_catalog(id) on delete cascade,
  language public.card_language not null,
  threshold_brl numeric(10,2) not null check (threshold_brl > 0),
  created_at timestamptz not null default now(),
  unique (user_id, catalog_card_id, language)
);

alter table public.price_alerts enable row level security;

create policy "owners read their price alerts" on public.price_alerts for select
  to authenticated using (auth.uid() = user_id);

create policy "owners create their price alerts" on public.price_alerts for insert
  to authenticated with check (auth.uid() = user_id);

create policy "owners delete their price alerts" on public.price_alerts for delete
  to authenticated using (auth.uid() = user_id);

grant select, insert, delete on public.price_alerts to authenticated;

-- Security invoker: o RLS de price_alerts limita ao dono; price_community e
-- cards_catalog já são legíveis por qualquer autenticado.
create function public.triggered_price_alerts()
returns table (
  alert_id uuid,
  catalog_card_id uuid,
  card_name text,
  language public.card_language,
  threshold_brl numeric,
  current_price numeric
)
language sql
stable
as $$
  select
    pa.id as alert_id,
    pa.catalog_card_id,
    cc.name as card_name,
    pa.language,
    pa.threshold_brl,
    pc.median_price as current_price
  from public.price_alerts pa
  join public.price_community pc
    on pc.catalog_card_id = pa.catalog_card_id and pc.language = pa.language
  join public.cards_catalog cc on cc.id = pa.catalog_card_id
  where pc.median_price >= pa.threshold_brl;
$$;

revoke all on function public.triggered_price_alerts() from public;
grant execute on function public.triggered_price_alerts() to authenticated;
