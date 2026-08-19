begin;
select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url) values
  ('33333333-3333-3333-3333-333333333333', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png'),
  ('44444444-4444-4444-4444-444444444444', 'base1-4', 'Charizard', '4', 'Base Set', 'base1', 'Rare Holo', 'https://example.com/charizard.png');

-- Alice quer Pikachu EN
insert into public.wishlist (id, user_id, catalog_card_id, language)
values ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en');

-- Bob põe um Pikachu EN à venda → match
insert into public.user_cards (id, user_id, catalog_card_id, language, condition, status)
values ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 'a_venda');

select is((select count(*)::int from public.matches), 1, 'carta a_venda casa com wishlist');

-- Carta guardada não gera match
insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 'guardada');

select is((select count(*)::int from public.matches), 1, 'carta guardada não gera match');

-- Pikachu PT não casa com wishlist EN
insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'pt', 'good', 'a_venda');

select is((select count(*)::int from public.matches), 1, 'idioma diferente não casa com wishlist específica');

-- Wishlist sem idioma casa com qualquer idioma (Charizard PT de Bob já em troca)
insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
values ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'pt', 'good', 'disponivel_troca');

insert into public.wishlist (user_id, catalog_card_id, language)
values ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', null);

select is((select count(*)::int from public.matches), 2, 'wishlist sem idioma casa com qualquer idioma');

-- Bloqueio remove matches existentes e impede novos
insert into public.blocks (blocker_id, blocked_id)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

select is((select count(*)::int from public.matches), 0, 'bloqueio apaga matches do par');

insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'mint', 'a_venda');

select is((select count(*)::int from public.matches), 0, 'par bloqueado não gera match novo');

-- Denúncia registra motivo
insert into public.reports (reporter_id, reported_id, reason, context)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'spam', 'chat');

select is(
  (select count(*)::int from public.reports where reporter_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'denúncia registrada com motivo'
);

select * from finish();
rollback;
