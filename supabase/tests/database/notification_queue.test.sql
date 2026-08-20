begin;
select plan(6);

select has_table('public', 'notification_queue', 'tabela notification_queue existe');

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, image_url) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'https://example.com/25.png');

-- Bob quer a carta
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

insert into public.wishlist (user_id, catalog_card_id, language) values
  ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'en');

-- Alice anuncia a carta → match → 2 notificações enfileiradas
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.user_cards (user_id, catalog_card_id, language, condition, status) values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'en', 'near_mint', 'a_venda');

-- Cliente autenticado não lê a fila
select throws_ok(
  $$ select count(*) from public.notification_queue $$,
  'permission denied for table notification_queue'
);

reset role;

select is(
  (select count(*)::int from public.notification_queue
    where user_id = '22222222-2222-2222-2222-222222222222' and data->>'type' = 'match'),
  1,
  'match enfileira notificação para quem deseja a carta (wanter)'
);

select is(
  (select count(*)::int from public.notification_queue
    where user_id = '11111111-1111-1111-1111-111111111111' and data->>'type' = 'match'),
  1,
  'match enfileira notificação para quem anunciou a carta (owner)'
);

-- Alice manda mensagem para Bob → 1 notificação só para o Bob, sem o conteúdo
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.conversations (id, participant_a, participant_b) values
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

insert into public.messages (conversation_id, sender_id, body) values
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'segredo: topa 100 reais?');

reset role;

select is(
  (select count(*)::int from public.notification_queue
    where user_id = '22222222-2222-2222-2222-222222222222'
      and data->>'type' = 'message'
      and body = 'Você recebeu uma nova mensagem.'),
  1,
  'mensagem enfileira notificação genérica para o destinatário (sem o conteúdo)'
);

select is(
  (select count(*)::int from public.notification_queue
    where user_id = '11111111-1111-1111-1111-111111111111' and data->>'type' = 'message'),
  0,
  'remetente não recebe notificação da própria mensagem'
);

select * from finish();
rollback;
