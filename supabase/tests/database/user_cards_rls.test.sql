begin;
select plan(3);

-- Two fake users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url)
values ('33333333-3333-3333-3333-333333333333', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png');

-- Alice inserts her own card as Alice
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'near_mint', 'guardada');

select is(
  (select count(*)::int from public.user_cards where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'Alice can insert her own card'
);

-- Bob should not see Alice's guardada card
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.user_cards),
  0,
  'Bob cannot see Alice''s card while it is guardada'
);

-- Bob cannot insert a card on Alice's behalf
select throws_ok(
  $$ insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
     values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 'guardada') $$,
  'new row violates row-level security policy for table "user_cards"'
);

select * from finish();
rollback;
