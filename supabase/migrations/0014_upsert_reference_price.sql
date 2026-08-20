-- Escrita de preço de referência internacional: só o job sync-prices (service
-- role) executa. Resolve external_id -> catalog_card_id e faz upsert na chave
-- (catalog_card_id, language) já única em price_reference.
create function public.upsert_reference_price(
  p_external_id text,
  p_language public.card_language,
  p_price_brl numeric,
  p_source text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_id uuid;
begin
  select id into v_card_id from public.cards_catalog where external_id = p_external_id;

  if v_card_id is null then
    -- Catálogo pode estar uma sync atrás; ignorar sem erro.
    return false;
  end if;

  insert into public.price_reference (catalog_card_id, language, price_brl, source, captured_at)
  values (v_card_id, p_language, p_price_brl, p_source, now())
  on conflict (catalog_card_id, language)
  do update set
    price_brl = excluded.price_brl,
    source = excluded.source,
    captured_at = excluded.captured_at;

  return true;
end;
$$;

revoke all on function public.upsert_reference_price(text, public.card_language, numeric, text) from public;
revoke all on function public.upsert_reference_price(text, public.card_language, numeric, text) from authenticated;
revoke all on function public.upsert_reference_price(text, public.card_language, numeric, text) from anon;
