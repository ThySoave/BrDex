begin;
select plan(3);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com');

-- Set A tem 3 cartas; set B tem 1 carta.
insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'base1-1', 'Alakazam', '1', 'Base Set', 'base1', 'Rare', 'https://example.com/1.png'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'base1-2', 'Blastoise', '2', 'Base Set', 'base1', 'Rare', 'https://example.com/2.png'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'base1-3', 'Chansey', '3', 'Base Set', 'base1', 'Rare', 'https://example.com/3.png'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'jungle-1', 'Clefable', '1', 'Jungle', 'jungle', 'Rare', 'https://example.com/4.png');

-- Alice tem 2 cartas distintas do set A, sendo uma duplicada (3 linhas no total).
insert into public.user_cards (user_id, catalog_card_id, language, condition, status) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'en', 'good', 'guardada'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'pt', 'good', 'guardada'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'en', 'good', 'guardada');

select results_eq(
  $$ select set_id, set_name, owned, total
     from public.set_progress('11111111-1111-1111-1111-111111111111') $$,
  $$ values ('base1'::text, 'Base Set'::text, 2::bigint, 3::bigint) $$,
  'usuária com 2 de 3 cartas do set vê owned=2 e total=3'
);

select is(
  (select owned from public.set_progress('11111111-1111-1111-1111-111111111111') where set_id = 'base1'),
  2::bigint,
  'duplicata da mesma carta não infla o owned'
);

select is(
  exists (select 1 from public.set_progress('11111111-1111-1111-1111-111111111111') where set_id = 'jungle'),
  false,
  'set sem carta da usuária não aparece'
);

select * from finish();
rollback;
