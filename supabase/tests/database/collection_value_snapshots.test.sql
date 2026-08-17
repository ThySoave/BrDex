begin;
select plan(4);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url)
values ('33333333-3333-3333-3333-333333333333', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png');

-- Alice tem 2 cópias EN comunitárias de 10 e 12 (mediana 11 → valor 22).
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 12, 'guardada');

select public.snapshot_collection_values();

select is(
  (select total_value::numeric from public.collection_value_snapshots
   where user_id = '11111111-1111-1111-1111-111111111111' and captured_on = current_date),
  22::numeric,
  'snapshot soma a mediana comunitária por cópia'
);

-- Rodar de novo no mesmo dia atualiza em vez de duplicar
select public.snapshot_collection_values();

select is(
  (select count(*)::int from public.collection_value_snapshots
   where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'um snapshot por usuário por dia'
);

-- RLS: Alice não vê snapshot de Bob
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada');
select public.snapshot_collection_values();

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.collection_value_snapshots),
  1,
  'usuário autenticado só vê os próprios snapshots'
);

select throws_ok(
  $$ insert into public.collection_value_snapshots (user_id, captured_on, total_value)
     values ('11111111-1111-1111-1111-111111111111', current_date - 1, 999) $$,
  '42501',
  null,
  'usuário não insere snapshot manualmente'
);

select * from finish();
rollback;
