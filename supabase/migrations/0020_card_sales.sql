-- Fase 17: registrar venda de carta.
-- Comparações de status usam ::text porque o valor novo do enum não pode ser
-- referenciado como literal enum na mesma transação em que foi adicionado.
alter type public.card_status add value if not exists 'vendida';

-- price_community v2: transações = compras (price_paid) + vendas (price_sold).
-- Mesmas colunas e mesmo filtro de outliers (IQR) da versão original (0002).
create or replace view public.price_community as
with priced as (
  select catalog_card_id, language, price_paid::numeric as price
  from public.user_cards
  where price_paid is not null
  union all
  select catalog_card_id, language, price_sold::numeric as price
  from public.user_cards
  where price_sold is not null
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

-- Valor da coleção ignora cartas vendidas (não estão mais na coleção física).
create or replace function public.snapshot_collection_values()
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
  where uc.status::text <> 'vendida'
  group by uc.user_id
  on conflict (user_id, captured_on)
  do update set total_value = excluded.total_value;
$$;
