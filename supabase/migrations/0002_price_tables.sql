create table public.price_reference (
  id uuid primary key default gen_random_uuid(),
  catalog_card_id uuid not null references public.cards_catalog(id) on delete cascade,
  language public.card_language not null,
  price_brl numeric(10,2) not null,
  source text not null,
  captured_at timestamptz not null default now(),
  unique (catalog_card_id, language)
);

alter table public.price_reference enable row level security;

create policy "reference prices are readable by any authenticated user"
  on public.price_reference for select
  to authenticated
  using (true);

grant select on public.price_reference to authenticated;

-- View colaborativa: agrega user_cards de TODOS os usuários (por isso NÃO usa
-- security_invoker — precisa atravessar o RLS de user_cards). Expõe apenas
-- agregados por (carta, idioma); nunca adicionar colunas por linha aqui.
create view public.price_community as
with priced as (
  select catalog_card_id, language, price_paid::numeric as price
  from public.user_cards
  where price_paid is not null
),
bounds as (
  select catalog_card_id, language,
    percentile_cont(0.25) within group (order by price) as q1,
    percentile_cont(0.75) within group (order by price) as q3
  from priced
  group by catalog_card_id, language
),
filtered as (
  select p.catalog_card_id, p.language, p.price
  from priced p
  join bounds b using (catalog_card_id, language)
  where p.price >= b.q1 - 1.5 * (b.q3 - b.q1)
    and p.price <= b.q3 + 1.5 * (b.q3 - b.q1)
)
select
  catalog_card_id,
  language,
  percentile_cont(0.5) within group (order by price) as median_price,
  min(price) as min_price,
  max(price) as max_price,
  count(*)::int as sample_count
from filtered
group by catalog_card_id, language;

grant select on public.price_community to authenticated;
