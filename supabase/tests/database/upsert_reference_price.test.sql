begin;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, image_url)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'https://example.com/25.png');

-- Primeira chamada grava linha nova
select is(
  public.upsert_reference_price('base1-25', 'en', 52.50, 'tcgplayer'),
  true,
  'retorna true quando grava preço de carta conhecida'
);

select is(
  (select price_brl::text || '|' || source || '|' || language::text
     from public.price_reference
    where catalog_card_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  '52.50|tcgplayer|en',
  'linha gravada com preço, fonte e idioma resolvidos para a carta do catálogo'
);

-- Chamada repetida atualiza sem duplicar
select public.upsert_reference_price('base1-25', 'en', 60.00, 'tcgplayer');

select is(
  (select count(*)::int from public.price_reference
    where catalog_card_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and language = 'en'),
  1,
  'chamada repetida não duplica a linha'
);

select is(
  (select price_brl from public.price_reference
    where catalog_card_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and language = 'en'),
  60.00,
  'chamada repetida atualiza o preço'
);

-- External id desconhecido é ignorado sem erro
select is(
  public.upsert_reference_price('desconhecida-999', 'en', 10.00, 'tcgplayer'),
  false,
  'external_id desconhecido retorna false'
);

-- authenticated não executa a função (escrita é só do job/service role)
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ select public.upsert_reference_price('base1-25', 'en', 1.00, 'tcgplayer') $$,
  'permission denied for function upsert_reference_price'
);

select * from finish();
rollback;
