begin;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com');

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

-- Cliente autenticado continua sem ler a fila
select throws_ok(
  $$ select count(*) from public.notification_queue $$,
  'permission denied for table notification_queue',
  'cliente autenticado não lê a fila de notificações'
);

reset role;

select public.process_price_alert_notifications();

select is(
  (select count(*)::int from public.notification_queue
    where user_id = '11111111-1111-1111-1111-111111111111'
      and data->>'type' = 'price_alert'
      and data->>'alertId' = '99999999-9999-9999-9999-999999999999'),
  1,
  'alerta disparado enfileira 1 notificação para o dono'
);

select is(
  (select count(*)::int from public.notification_queue
    where data->>'alertId' = '88888888-8888-8888-8888-888888888888'),
  0,
  'alerta abaixo do limiar não enfileira'
);

-- Segunda execução não duplica (notified_at marcado)
select public.process_price_alert_notifications();

select is(
  (select count(*)::int from public.notification_queue where data->>'type' = 'price_alert'),
  1,
  'reexecução não duplica notificação de alerta já notificado'
);

-- Preço "cai" abaixo do limiar (simulado subindo o limiar acima da mediana):
-- a função re-arma o alerta (notified_at volta a null) sem notificar de novo
update public.price_alerts set threshold_brl = 150.00
  where id = '99999999-9999-9999-9999-999999999999';

select public.process_price_alert_notifications();

select is(
  (select notified_at from public.price_alerts
    where id = '99999999-9999-9999-9999-999999999999'),
  null::timestamptz,
  'preço abaixo do limiar re-arma o alerta (notified_at volta a null)'
);

-- Novo cruzamento do limiar → notifica de novo
update public.price_alerts set threshold_brl = 90.00
  where id = '99999999-9999-9999-9999-999999999999';

select public.process_price_alert_notifications();

select is(
  (select count(*)::int from public.notification_queue
    where data->>'alertId' = '99999999-9999-9999-9999-999999999999'),
  2,
  'novo cruzamento do limiar após re-arme notifica de novo'
);

select * from finish();
rollback;
