begin;
select plan(5);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

-- Cartas no catálogo (seed como service role)
insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, image_url) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'https://example.com/25.png'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'base1-1', 'Alakazam', '1', 'Base Set', 'base1', 'https://example.com/1.png');

-- Alice tem as cartas com preço pago → alimenta price_community (mediana)
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid) values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'en', 'near_mint', 100.00),
  ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'en', 'near_mint', 50.00);

-- Alerta disparável (mediana 100 >= 90) e alerta não disparável (mediana 50 < 80)
insert into public.price_alerts (id, user_id, catalog_card_id, language, threshold_brl) values
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'en', 90.00),
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'en', 80.00);

select is(
  (select count(*)::int from public.price_alerts where user_id = '11111111-1111-1111-1111-111111111111'),
  2,
  'dona cria os próprios alertas'
);

-- Bob não vê alertas da Alice
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.price_alerts),
  0,
  'outro usuário não vê alertas alheios'
);

-- Bob não insere alerta em nome da Alice
select throws_ok(
  $$ insert into public.price_alerts (user_id, catalog_card_id, language, threshold_brl)
     values ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'pt', 10.00) $$,
  'new row violates row-level security policy for table "price_alerts"'
);

-- Alice consulta os alertas disparados
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.triggered_price_alerts()
    where alert_id = '99999999-9999-9999-9999-999999999999'
      and card_name = 'Pikachu'
      and current_price = 100.00),
  1,
  'alerta dispara quando a mediana comunitária atinge o threshold'
);

select is(
  (select count(*)::int from public.triggered_price_alerts()
    where alert_id = '88888888-8888-8888-8888-888888888888'),
  0,
  'alerta com threshold acima da mediana não dispara'
);

select * from finish();
rollback;
