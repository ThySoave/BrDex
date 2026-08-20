begin;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'dave@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, image_url) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'https://example.com/25.png'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'base1-1', 'Alakazam', '1', 'Base Set', 'base1', 'https://example.com/1.png'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'base1-4', 'Charizard', '4', 'Base Set', 'base1', 'https://example.com/4.png');

-- Dave é premium (verificado); seed como service role
insert into public.premium_subscriptions (user_id) values
  ('44444444-4444-4444-4444-444444444444');

-- Alice bloqueou a Carol
insert into public.blocks (blocker_id, blocked_id) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');

-- Cartas (seed como service role, bypassa RLS):
-- bob: Pikachu à venda + Alakazam guardada; carol: Pikachu à venda (bloqueada);
-- dave: Charizard à venda (verificado); alice: Pikachu à venda (própria, não aparece)
insert into public.user_cards (id, user_id, catalog_card_id, language, condition, status) values
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'en', 'near_mint', 'a_venda'),
  ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'en', 'good', 'guardada'),
  ('c0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'pt', 'excellent', 'a_venda'),
  ('d0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'en', 'mint', 'disponivel_troca'),
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'en', 'played', 'a_venda');

-- Alice busca no mercado
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.search_market_listings('')
    where user_card_id = 'b0000000-0000-0000-0000-000000000001'),
  1,
  'carta à venda de outro usuário aparece na busca'
);

select is(
  (select count(*)::int from public.search_market_listings('')
    where user_card_id = 'b0000000-0000-0000-0000-000000000002'),
  0,
  'carta guardada de outro usuário não aparece'
);

select is(
  (select count(*)::int from public.search_market_listings('')
    where user_card_id = 'a0000000-0000-0000-0000-000000000001'),
  0,
  'as próprias cartas não aparecem'
);

select is(
  (select count(*)::int from public.search_market_listings('')
    where user_card_id = 'c0000000-0000-0000-0000-000000000001'),
  0,
  'carta de usuário bloqueado não aparece'
);

select is(
  (select array_agg(distinct card_name) from public.search_market_listings('Chari')),
  array['Charizard'],
  'filtro de busca por nome funciona'
);

select is(
  (select user_card_id from public.search_market_listings('') limit 1),
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'vendedor verificado vem primeiro na ordenação'
);

select * from finish();
rollback;
