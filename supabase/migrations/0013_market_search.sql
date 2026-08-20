-- Busca do mercado: cartas de outros usuários com status a_venda/disponivel_troca.
-- Security definer porque o RLS de user_cards é dono-somente por design (Fase 1);
-- esta função é o único ponto de exposição pública e devolve apenas o recorte
-- permitido pelo spec — nunca cartas guardadas, nunca as do chamador, nunca de
-- pares bloqueados, nunca preços privados do dono.
create function public.search_market_listings(search_text text)
returns table (
  user_card_id uuid,
  catalog_card_id uuid,
  card_name text,
  card_image_url text,
  language public.card_language,
  condition public.card_condition,
  status public.card_status,
  seller_id uuid,
  seller_verified boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    uc.id as user_card_id,
    uc.catalog_card_id,
    cc.name as card_name,
    cc.image_url as card_image_url,
    uc.language,
    uc.condition,
    uc.status,
    uc.user_id as seller_id,
    public.is_premium(uc.user_id) as seller_verified
  from public.user_cards uc
  join public.cards_catalog cc on cc.id = uc.catalog_card_id
  where uc.status <> 'guardada'
    and uc.user_id <> auth.uid()
    and not public.users_blocked(auth.uid(), uc.user_id)
    and cc.name ilike '%' || search_text || '%'
  order by public.is_premium(uc.user_id) desc, cc.name asc
  limit 50;
$$;

revoke all on function public.search_market_listings(text) from public;
grant execute on function public.search_market_listings(text) to authenticated;
