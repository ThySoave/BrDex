begin;
select plan(5);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url)
values ('33333333-3333-3333-3333-333333333333', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png');

-- 5 preços EN: 10, 10, 11, 12 e um outlier 1000 (IQR: q1=10, q3=12 → teto 15)
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 11, 'guardada'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 12, 'guardada'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 1000, 'guardada');

-- 1 preço PT: mercado separado
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'pt', 'good', 50, 'guardada');

select is(
  (select sample_count from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'en'),
  4,
  'outlier fica fora da contagem EN'
);

select is(
  (select median_price::numeric from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'en'),
  10.5::numeric,
  'mediana EN calculada sem o outlier'
);

select is(
  (select max_price::numeric from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'en'),
  12::numeric,
  'max EN ignora o outlier'
);

select is(
  (select median_price::numeric from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'pt'),
  50::numeric,
  'mercado PT é separado do EN'
);

-- price_reference aceita uma âncora EN e é única por (carta, idioma)
insert into public.price_reference (catalog_card_id, language, price_brl, source)
values ('33333333-3333-3333-3333-333333333333', 'en', 42.90, 'seed-manual');

select throws_ok(
  $$ insert into public.price_reference (catalog_card_id, language, price_brl, source)
     values ('33333333-3333-3333-3333-333333333333', 'en', 99.99, 'seed-manual') $$,
  '23505',
  null,
  'não pode haver duas referências para a mesma (carta, idioma)'
);

select * from finish();
rollback;
